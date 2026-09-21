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

    test('returns text for visible ranges with document offsets', () => {
        const visibleRange = range(position(2, 1), position(2, 8));
        const visibleDocument = mockType<TextDocument>({
            lineCount: 5,
            lineAt: (line: number) => ({text: `LINE_${line}`}),
            getText: () => 'VISIBLE_WITH_OVERLAP',
            offsetAt: (requestedPosition: Position) => requestedPosition.line === 1 ? 21 : 0
        });
        const visibleEditor = mockMethods<VsTextEditor>([], {
            document: visibleDocument,
            visibleRanges: [visibleRange]
        });

        assert.deepEqual(new TextEditor(visibleEditor).visibleTexts, [{text: 'VISIBLE_WITH_OVERLAP', offset: 21}]);
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
