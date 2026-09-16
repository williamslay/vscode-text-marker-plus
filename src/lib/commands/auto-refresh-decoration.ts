import TextEditor from '../vscode/text-editor';
import {CommandLike} from '../vscode/vscode';
import DecorationOperatorFactory from '../decoration/decoration-operator-factory';

export default class AutoRefreshDecoration implements CommandLike {
    private readonly decorationOperatorFactory: DecorationOperatorFactory;

    constructor(decorationOperatorFactory: DecorationOperatorFactory) {
        this.decorationOperatorFactory = decorationOperatorFactory;
    }

    execute(editor?: TextEditor) {
        if (!editor) return;
        this.decorationOperatorFactory.create([editor]).refreshNearbyDecorations();
        this.refreshVisibleEditors();
    }

    refreshVisibleEditors() {
        this.decorationOperatorFactory.createForVisibleEditors().refreshDecorations();
    }

}
