import {verify} from '../../helpers/mock';

import AppIntegrator from '../../../lib/app-integrator';
import {createFakeEditor} from '../helpers/fake-editor';
import {createFakeVsCode, EXECUTION_CONTEXT} from '../helpers/fake-vscode';
import {Position, Range, TextEditorDecorationType} from 'vscode';

suite('Highlight command', () => {

    let editor1: any;
    let editor2: any;
    let editor3: any;
    let command: any;
    let fakeVscode: any;
    setup(() => {
        editor1 = createFakeEditor({wholeText: 'A TEXT B TEXT C', selectedText: 'TEXT'});
        editor2 = createFakeEditor({wholeText: 'a TEXT'});
        editor3 = createFakeEditor({wholeText: 'a TEXT', selectedText: 'TEX'});
        fakeVscode = createFakeVsCode({editors: [editor1, editor2, editor3]});
        AppIntegrator.create(fakeVscode, console).integrate(EXECUTION_CONTEXT);

        command = fakeVscode._commands['textmarker.toggleHighlight'];
    });

    teardown(() => {
        EXECUTION_CONTEXT.subscriptions.forEach(subscription => {
            if (subscription && typeof subscription.dispose === 'function') subscription.dispose();
        });
        EXECUTION_CONTEXT.subscriptions.length = 0;
    });

    test('highlights selected text', async () => {
        await command(editor1);

        verify(editor1.setDecorations('DECORATION_TYPE_1', [
            new Range(new Position(0, 2), new Position(0, 6)),
            new Range(new Position(0, 9), new Position(0, 13))
        ]));
        verify(editor2.setDecorations('DECORATION_TYPE_1', [
            new Range(new Position(0, 2), new Position(0, 6))
        ]));
    });

    test('add another highlight to the substring of already selected text', async () => {
        await command(editor1);
        await command(editor3);

        verify(editor1.setDecorations('DECORATION_TYPE_2', [
            new Range(new Position(0, 2), new Position(0, 5)),
            new Range(new Position(0, 9), new Position(0, 12))
        ]));
        verify(editor3.setDecorations('DECORATION_TYPE_2', [
            new Range(new Position(0, 2), new Position(0, 5))
        ]));
    });

    test('unhighlight selected text if the exact text is already selected', async () => {
        await command(editor1);
        await command(editor1);

        verify(editor1.setDecorations('DECORATION_TYPE_1', []));
        verify(editor2.setDecorations('DECORATION_TYPE_1', []));
    });

    test('restores saved highlights when active editor is not yet visible at startup', async () => {
        const editor = createFakeEditor({wholeText: 'A TEXT B'});
        const startupVscode = createFakeVsCode({
            editors: [],
            activeEditor: editor,
            savedHighlights: [{
                pattern: {
                    type: 'string',
                    expression: 'TEXT',
                    ignoreCase: false,
                    wholeMatch: false
                },
                color: 'COLOUR_A'
            }]
        });
        AppIntegrator.create(startupVscode, console).integrate(EXECUTION_CONTEXT);

        await new Promise(resolve => setTimeout(resolve, 50));

        const decorationType = 'DECORATION_TYPE_1' as unknown as TextEditorDecorationType;
        verify(editor.setDecorations(decorationType, [
            new Range(new Position(0, 2), new Position(0, 6))
        ]));
    });

    test('restores saved highlights with one startup render', async () => {
        const editor = createFakeEditor({wholeText: 'A TEXT B'});
        const startupVscode = createFakeVsCode({
            editors: [editor],
            savedHighlights: [{
                pattern: {
                    type: 'string',
                    expression: 'TEXT',
                    ignoreCase: false,
                    wholeMatch: false
                },
                color: 'COLOUR_A'
            }]
        });
        AppIntegrator.create(startupVscode, console).integrate(EXECUTION_CONTEXT);

        await new Promise(resolve => setTimeout(resolve, 50));

        const decorationType = 'DECORATION_TYPE_1' as unknown as TextEditorDecorationType;
        verify(editor.setDecorations(decorationType, [
            new Range(new Position(0, 2), new Position(0, 6))
        ]), {times: 1});
    });
});
