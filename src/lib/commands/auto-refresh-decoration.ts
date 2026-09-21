import TextEditor from '../vscode/text-editor';
import {CommandLike, DocumentChangeLike} from '../vscode/vscode';
import DecorationOperatorFactory from '../decoration/decoration-operator-factory';
import WindowComponent from '../vscode/window';

export default class AutoRefreshDecoration implements CommandLike {
    private readonly decorationOperatorFactory: DecorationOperatorFactory;
    private readonly windowComponent: WindowComponent;

    constructor(decorationOperatorFactory: DecorationOperatorFactory, windowComponent: WindowComponent) {
        this.decorationOperatorFactory = decorationOperatorFactory;
        this.windowComponent = windowComponent;
    }

    execute(_editor?: TextEditor) {
        const editor = this.windowComponent.activeTextEditor;
        if (editor) this.createForActiveDocument(editor).refreshDecorations();
    }

    executeDocumentChange(change: DocumentChangeLike) {
        const editor = this.windowComponent.activeTextEditor;
        if (!editor || editor.id !== change.document.uri.toString()) return;
        this.createForActiveDocument(editor).refreshDecorations();
    }

    refreshVisibleEditors() {
        const editors = this.windowComponent.visibleTextEditors;
        if (editors.length > 0) {
            this.decorationOperatorFactory.create(editors).refreshDecorations();
            return;
        }
        const editor = this.windowComponent.activeTextEditor;
        if (editor) this.decorationOperatorFactory.create([editor]).refreshDecorations();
    }

    private createForActiveDocument(editor: TextEditor) {
        const editors = this.windowComponent.visibleTextEditors.filter(visibleEditor => visibleEditor.id === editor.id);
        return this.decorationOperatorFactory.create(editors.length > 0 ? editors : [editor]);
    }

}
