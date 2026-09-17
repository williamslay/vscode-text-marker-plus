import {mock, mockType, verify, when} from '../../helpers/mock';
import DecorationOperatorFactory from '../../../lib/decoration/decoration-operator-factory';
import TextEditor from '../../../lib/vscode/text-editor';
import DecorationOperator from '../../../lib/decoration/decoration-operator';
import AutoRefreshDecoration from '../../../lib/commands/auto-refresh-decoration';
import WindowComponent from '../../../lib/vscode/window';

suite('AutoRefreshDecoration', () => {

    let decorationOperator: DecorationOperator;
    let command: AutoRefreshDecoration;

    const editor = {id: 'ACTIVE', selectedText: 'SELECTED'} as TextEditor;

    setup(() => {
        decorationOperator = mock(DecorationOperator);
        const decorationOperatorFactory = mock(DecorationOperatorFactory);
        when(decorationOperatorFactory.create([editor])).thenReturn(decorationOperator);
        const windowComponent = mockType<WindowComponent>({activeTextEditor: editor, visibleTextEditors: [editor]});

        command = new AutoRefreshDecoration(decorationOperatorFactory, windowComponent);
    });

    test('it refreshes nearby decorations before the full refresh', () => {
        command.execute(editor);

        verify(decorationOperator.refreshNearbyDecorations());
        verify(decorationOperator.refreshDecorations());
    });

    test('it does nothing if editor is not given when invoked', () => {
        command.execute();

        verify(decorationOperator.refreshNearbyDecorations(), {times: 0});
        verify(decorationOperator.refreshDecorations(), {times: 0});
    });

    test('it refreshes every visible editor when visible panes change', () => {
        command.refreshVisibleEditors();

        verify(decorationOperator.refreshDecorations());
    });

    test('it refreshes only visible panes for the active document', () => {
        const otherEditor = {id: 'BACKGROUND'} as TextEditor;
        const windowComponent = mockType<WindowComponent>({
            activeTextEditor: editor,
            visibleTextEditors: [editor, otherEditor]
        });
        const decorationOperatorFactory = mock(DecorationOperatorFactory);
        when(decorationOperatorFactory.create([editor])).thenReturn(decorationOperator);
        const activeOnlyCommand = new AutoRefreshDecoration(decorationOperatorFactory, windowComponent);

        activeOnlyCommand.execute(editor);

        verify(decorationOperatorFactory.create([editor]));
        verify(decorationOperatorFactory.createForVisibleEditors(), {times: 0});
    });

});
