import {mock, verify, when} from '../../helpers/mock';
import DecorationOperatorFactory from '../../../lib/decoration/decoration-operator-factory';
import TextEditor from '../../../lib/vscode/text-editor';
import DecorationOperator from '../../../lib/decoration/decoration-operator';
import AutoRefreshDecoration from '../../../lib/commands/auto-refresh-decoration';

suite('AutoRefreshDecoration', () => {

    let decorationOperator: DecorationOperator;
    let visibleDecorationOperator: DecorationOperator;
    let command: AutoRefreshDecoration;

    const editor = {selectedText: 'SELECTED'} as TextEditor;

    setup(() => {
        decorationOperator = mock(DecorationOperator);
        visibleDecorationOperator = mock(DecorationOperator);

        const decorationOperatorFactory = mock(DecorationOperatorFactory);
        when(decorationOperatorFactory.create([editor])).thenReturn(decorationOperator);
        when(decorationOperatorFactory.createForVisibleEditors()).thenReturn(visibleDecorationOperator);

        command = new AutoRefreshDecoration(decorationOperatorFactory);
    });

    test('it refreshes nearby decorations before the full refresh', () => {
        command.execute(editor);

        verify(decorationOperator.refreshNearbyDecorations());
        verify(visibleDecorationOperator.refreshDecorations());
    });

    test('it does nothing if editor is not given when invoked', () => {
        command.execute();

        verify(decorationOperator.refreshNearbyDecorations(), {times: 0});
        verify(decorationOperator.refreshDecorations(), {times: 0});
    });

    test('it refreshes every visible editor when visible panes change', () => {
        command.refreshVisibleEditors();

        verify(visibleDecorationOperator.refreshDecorations());
    });

});
