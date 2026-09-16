import TextEditor from '../../../lib/vscode/text-editor';
import {Position, Range, Selection, TextDocument, TextEditor as VsTextEditor, TextEditorRevealType} from 'vscode';
import {mockMethods, mockType, verify, when} from '../../helpers/mock';
import * as assert from 'assert';

suite('TextEditor', () => {
    const position1 = position(0, 0);
    const position2 = position(0, 5);

    const document = mockMethods<TextDocument>(['positionAt', 'getText', 'offsetAt']);
    when(document.positionAt(0)).thenReturn(position1);
    when(document.positionAt(5)).thenReturn(position2);

    const rawEditor = mockMethods<VsTextEditor>(['revealRange'], {document});

    const editor = new TextEditor(rawEditor);

    test('reveals the area if the given cursor position is out of visible area', () => {
        editor.selection = {start: 0, end: 5};
        assert.deepEqual(rawEditor.selection, selection(position1, position2));
        verify(rawEditor.revealRange(range(position1, position2), TextEditorRevealType.InCenterIfOutsideViewport));
    });

    test('returns nearby text with its document offset', () => {
        const nearbyDocument = mockType<TextDocument>({
            lineCount: 3,
            lineAt: () => ({text: 'VISIBLE'}),
            getText: () => 'VISIBLE\nVISIBLE\nVISIBLE',
            offsetAt: () => 100
        });
        const visibleEditor = mockMethods<VsTextEditor>([], {
            selection: {active: position(1, 2)},
            document: nearbyDocument
        });

        assert.deepEqual(new TextEditor(visibleEditor).nearbyTexts, [{text: 'VISIBLE\nVISIBLE\nVISIBLE', offset: 100}]);
    });

    function position(line: number, character: number): Position {
        return {line, character} as Position;
    }

    function selection(start: Position, end: Position): Selection {
        return {start, end} as Selection;
    }

    function range(start: Position, end: Position): Range {
        return {start, end} as Range;
    }
});
