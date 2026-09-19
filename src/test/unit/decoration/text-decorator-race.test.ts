import * as assert from 'assert';
import {some, none} from 'fp-ts/lib/Option';
import {mock, mockMethods, mockType, verify, when} from '../../helpers/mock';
import TextDecorator from '../../../lib/decoration/text-decorator';
import TextLocationRegistry from '../../../lib/text-location-registry';
import TextEditor from '../../../lib/vscode/text-editor';
import {Decoration} from '../../../lib/entities/decoration';
import StringPattern from '../../../lib/pattern/string';
import {FullMatchRequest, FullMatchService} from '../../../lib/matching/full-match-service';
import {DecorationTypeRegistry} from '../../../lib/decoration/decoration-type-registry';
import {TextEditorDecorationType} from 'vscode';
import {FlatRange} from '../../../lib/vscode/flat-range';

suite('TextDecorator full-match races', () => {
    test('matches visible ranges before matching their complement', async () => {
        const service = new RecordingMatchService();
        const editor = mockMethods<TextEditor>(['setDecorations'], {
            id: 'EDITOR',
            version: 1,
            wholeText: 'BEFORE VISIBLE AFTER',
            visibleTexts: [{text: 'VISIBLE', offset: 7}]
        });
        const decoration = new Decoration('DECORATION', new StringPattern({phrase: 'VISIBLE'}), 'pink');
        const decorationType = mockType<TextEditorDecorationType>();
        const types = mock(DecorationTypeRegistry);
        when(types.provideFor(decoration)).thenReturn(decorationType);
        const decorator = new TextDecorator(new TextLocationRegistry(), types, service);

        await decorator.decorate([editor], [decoration]);

        assert.deepEqual(service.requests, ['VISIBLE', 'E AFTER', 'BEFORE V']);
    });

    test('cancels complement matching after a newer refresh', async () => {
        const service = new DeferredMatchService();
        const editor = mockMethods<TextEditor>(['setDecorations'], {
            id: 'EDITOR',
            version: 1,
            wholeText: 'BEFORE VISIBLE AFTER',
            visibleTexts: [{text: 'VISIBLE', offset: 7}],
            nearbyTexts: [{text: 'VISIBLE', offset: 7}]
        });
        const decoration = new Decoration('DECORATION', new StringPattern({phrase: 'VISIBLE'}), 'pink');
        const decorationType = mockType<TextEditorDecorationType>();
        const types = mock(DecorationTypeRegistry);
        when(types.provideFor(decoration)).thenReturn(decorationType);
        const decorator = new TextDecorator(new TextLocationRegistry(), types, service);

        const refresh = decorator.decorate([editor], [decoration]);
        decorator.decorateNearby([editor], [decoration]);
        service.resolve(0, []);
        await refresh;
        await Promise.resolve();

        assert.deepEqual(service.requests, ['VISIBLE']);
    });

    test('does not apply result after decoration removal', async () => {
        const service = new DeferredMatchService();
        const editor = mockMethods<TextEditor>(['setDecorations', 'unsetDecorations'], {
            id: 'EDITOR', version: 1, wholeText: 'TEXT'
        });
        const decoration = new Decoration('DECORATION', new StringPattern({phrase: 'TEXT'}), 'pink');
        const decorationType = mockType<TextEditorDecorationType>();
        const types = mock(DecorationTypeRegistry);
        when(types.provideFor(decoration)).thenReturn(decorationType);
        when(types.inquire(decoration.id)).thenReturn(some(decorationType));
        const registry = new TextLocationRegistry();
        const decorator = new TextDecorator(registry, types, service);

        const refresh = decorator.decorate([editor], [decoration]);
        decorator.undecorate([editor], [decoration.id]);
        service.resolve(0, [{start: 0, end: 4}]);
        await refresh;

        verify(editor.setDecorations(decorationType, [{start: 0, end: 4}]), {times: 0});
        assert.deepEqual(registry.queryDecorationId('EDITOR', {start: 0, end: 0}, 1), none);
    });

    test('keeps nearby ranges visual-only', () => {
        const editor = mockMethods<TextEditor>(['setDecorations'], {
            id: 'EDITOR', version: 1, nearbyTexts: [{text: 'TEXT', offset: 10}]
        });
        const decoration = new Decoration('DECORATION', new StringPattern({phrase: 'TEXT'}), 'pink');
        const decorationType = mockType<TextEditorDecorationType>();
        const types = mock(DecorationTypeRegistry);
        when(types.provideFor(decoration)).thenReturn(decorationType);
        const registry = new TextLocationRegistry();
        new TextDecorator(registry, types).decorateNearby([editor], [decoration]);

        verify(editor.setDecorations(decorationType, [{start: 10, end: 14}]));
        assert.deepEqual(registry.queryDecorationId('EDITOR', {start: 10, end: 10}, 1), none);
    });

    test('ignores an older full result after a newer refresh starts', async () => {
        const service = new DeferredMatchService();
        const editor = mockMethods<TextEditor>(['setDecorations'], {
            id: 'EDITOR', version: 1, wholeText: 'TEXT'
        });
        const decoration = new Decoration('DECORATION', new StringPattern({phrase: 'TEXT'}), 'pink');
        const decorationType = mockType<TextEditorDecorationType>();
        const types = mock(DecorationTypeRegistry);
        when(types.provideFor(decoration)).thenReturn(decorationType);
        const registry = new TextLocationRegistry();
        const decorator = new TextDecorator(registry, types, service);

        const first = decorator.decorate([editor], [decoration]);
        const second = decorator.decorate([editor], [decoration]);
        service.resolve(0, [{start: 9, end: 13}]);
        service.resolve(1, [{start: 0, end: 4}]);
        await Promise.all([first, second]);

        verify(editor.setDecorations(decorationType, [{start: 9, end: 13}]), {times: 0});
        verify(editor.setDecorations(decorationType, [{start: 0, end: 4}]));
    });

});

class DeferredMatchService implements FullMatchService {
    private readonly resolvers: Array<(ranges: FlatRange[]) => void> = [];
    readonly requests: string[] = [];

    match(request: FullMatchRequest): Promise<FlatRange[]> {
        this.requests.push(request.text);
        return new Promise(resolve => {
            this.resolvers.push(resolve);
        });
    }

    resolve(index: number, ranges: FlatRange[]): void {
        const resolver = this.resolvers[index];
        if (resolver) resolver(ranges);
    }

    dispose(): void {
        return;
    }
}

class RecordingMatchService implements FullMatchService {
    readonly requests: string[] = [];

    match(request: FullMatchRequest): Promise<FlatRange[]> {
        this.requests.push(request.text);
        return Promise.resolve([]);
    }

    dispose(): void {
        return;
    }
}
