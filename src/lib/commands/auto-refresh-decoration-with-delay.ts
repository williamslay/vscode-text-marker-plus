import {Logger} from '../Logger';
import {CommandLike} from '../vscode/vscode';
import WindowComponent from '../vscode/window';
import Debouncer from '../debouncer';
import DecorationOperatorFactory from '../decoration/decoration-operator-factory';
import TextEditor from '../vscode/text-editor';

type DocumentChange = {
    readonly document: {
        readonly uri: {
            readonly toString: () => string;
        };
    };
};

export default class AutoRefreshDecorationWithDelay implements CommandLike {
    private readonly decorationOperatorFactory: DecorationOperatorFactory;
    private readonly debouncer: Debouncer;
    private readonly windowComponent: WindowComponent;
    private readonly logger: Logger;

    constructor(decorationOperatorFactory: DecorationOperatorFactory,
                debouncer: Debouncer,
                windowComponent: WindowComponent,
                logger: Logger) {
        this.decorationOperatorFactory = decorationOperatorFactory;
        this.debouncer = debouncer;
        this.windowComponent = windowComponent;
        this.logger = logger;
    }

    execute(target?: TextEditor | DocumentChange) {
        const change = target && 'document' in target ? target : undefined;
        const editor = this.windowComponent.activeTextEditor;
        const changedDocumentId = change && change.document.uri.toString();
        if (changedDocumentId && (!editor || editor.id !== changedDocumentId)) return;
        if (editor) {
            try {
                this.refreshNearby(editor);
            } catch (e) {
                this.logger.error(e instanceof Error ? e.stack || e.message : String(e));
            }
        }
        this.debouncer.debounce(() => {
            try {
                const currentEditor = this.windowComponent.activeTextEditor;
                if (currentEditor && (!changedDocumentId || currentEditor.id === changedDocumentId)) {
                    this.refresh(currentEditor);
                }
            } catch (e) {
                this.logger.error(e instanceof Error ? e.stack || e.message : String(e));
            }
        });
    }

    private refresh(editor: TextEditor) {
        const editors = this.windowComponent.visibleTextEditors.filter(visibleEditor => visibleEditor.id === editor.id);
        const decorationOperator = this.decorationOperatorFactory.create(editors.length > 0 ? editors : [editor]);
        decorationOperator.refreshDecorations();
    }

    private refreshNearby(editor: TextEditor) {
        const decorationOperator = this.decorationOperatorFactory.create([editor]);
        decorationOperator.refreshNearbyDecorations();
    }

}
