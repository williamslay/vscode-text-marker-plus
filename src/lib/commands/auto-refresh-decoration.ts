import TextEditor from '../vscode/text-editor';
import {CommandLike} from '../vscode/vscode';
import DecorationOperatorFactory from '../decoration/decoration-operator-factory';
import WindowComponent from '../vscode/window';

export default class AutoRefreshDecoration implements CommandLike {
    private readonly decorationOperatorFactory: DecorationOperatorFactory;
    private readonly windowComponent: WindowComponent;

    constructor(decorationOperatorFactory: DecorationOperatorFactory, windowComponent: WindowComponent) {
        this.decorationOperatorFactory = decorationOperatorFactory;
        this.windowComponent = windowComponent;
    }

    execute(editor?: TextEditor) {
        if (!editor) return;
        this.decorationOperatorFactory.create([editor]).refreshNearbyDecorations();
        this.createForActiveDocument(editor).refreshDecorations();
    }

    refreshVisibleEditors() {
        const editor = this.windowComponent.activeTextEditor;
        if (editor) this.createForActiveDocument(editor).refreshDecorations();
    }

    private createForActiveDocument(editor: TextEditor) {
        const editors = this.windowComponent.visibleTextEditors.filter(visibleEditor => visibleEditor.id === editor.id);
        return this.decorationOperatorFactory.create(editors.length > 0 ? editors : [editor]);
    }

}
