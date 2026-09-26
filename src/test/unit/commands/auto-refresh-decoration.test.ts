import {any, mock, mockType, verify, when} from '../../helpers/mock';
import DecorationOperatorFactory from '../../../lib/decoration/decoration-operator-factory';
import TextEditor from '../../../lib/vscode/text-editor';
import DecorationOperator from '../../../lib/decoration/decoration-operator';
import AutoRefreshDecoration from '../../../lib/commands/auto-refresh-decoration';
import WindowComponent from '../../../lib/vscode/window';

suite('AutoRefreshDecoration', () => {

    let decorationOperator: DecorationOperator;
    let decorationOperatorFactory: DecorationOperatorFactory;
    let command: AutoRefreshDecoration;

    const editor = {id: 'ACTIVE', selectedText: 'SELECTED'} as TextEditor;

    setup(() => {
        decorationOperator = mock(DecorationOperator);
        decorationOperatorFactory = mock(DecorationOperatorFactory);
        when(decorationOperatorFactory.create([editor])).thenReturn(decorationOperator);
        const windowComponent = mockType<WindowComponent>({activeTextEditor: editor, visibleTextEditors: [editor]});

        command = new AutoRefreshDecoration(decorationOperatorFactory, windowComponent);
    });

    test('it uses one staged refresh for active-document changes', () => {
        command.execute();

        verify(decorationOperator.refreshDecorations());
    });

    test('it does nothing if there is no active editor', () => {
        const windowComponent = mockType<WindowComponent>({activeTextEditor: undefined, visibleTextEditors: []});
        const inactiveCommand = new AutoRefreshDecoration(decorationOperatorFactory, windowComponent);

        inactiveCommand.execute();

        verify(decorationOperator.refreshDecorations(), {times: 0});
    });

    test('it ignores changes for background documents', () => {
        const backgroundDocument = {document: {uri: {toString: () => 'BACKGROUND'}}};

        command.executeDocumentChange(backgroundDocument);

        verify(decorationOperatorFactory.create(any()), {times: 0});
    });

    test('it refreshes the active document when its contents change', () => {
        const activeDocument = {document: {uri: {toString: () => 'ACTIVE'}}};

        command.executeDocumentChange(activeDocument);

        verify(decorationOperator.refreshDecorations());
    });

    test('it refreshes every visible editor when visible panes change', () => {
        command.refreshVisibleEditors();

        verify(decorationOperator.refreshDecorations());
    });

    test('it refreshes the active editor when no editors are visible', () => {
        const windowComponent = mockType<WindowComponent>({activeTextEditor: editor, visibleTextEditors: []});
        const fallbackCommand = new AutoRefreshDecoration(decorationOperatorFactory, windowComponent);

        fallbackCommand.refreshVisibleEditors();

        verify(decorationOperatorFactory.create([editor]));
        verify(decorationOperator.refreshDecorations(), {times: 1});
    });

    test('it refreshes non-active visible editors too', () => {
        const otherEditor = {id: 'OTHER'} as TextEditor;
        const windowComponent = mockType<WindowComponent>({
            activeTextEditor: editor,
            visibleTextEditors: [editor, otherEditor]
        });
        const decorationOperatorFactory = mock(DecorationOperatorFactory);
        when(decorationOperatorFactory.create([editor, otherEditor])).thenReturn(decorationOperator);
        const visibleEditorCommand = new AutoRefreshDecoration(decorationOperatorFactory, windowComponent);

        visibleEditorCommand.refreshVisibleEditors();

        verify(decorationOperatorFactory.create([editor, otherEditor]));
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

        activeOnlyCommand.execute();

        verify(decorationOperatorFactory.create([editor]));
        verify(decorationOperatorFactory.createForVisibleEditors(), {times: 0});
    });

});
