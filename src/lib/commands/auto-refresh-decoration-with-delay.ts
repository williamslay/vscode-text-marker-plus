import {Logger} from '../Logger';
import {CommandLike} from '../vscode/vscode';
import WindowComponent from '../vscode/window';
import Debouncer from '../debouncer';
import DecorationOperatorFactory from '../decoration/decoration-operator-factory';
import TextEditor from '../vscode/text-editor';

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

    execute() {
        const editor = this.windowComponent.activeTextEditor;
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
                if (currentEditor) this.refresh(currentEditor);
            } catch (e) {
                this.logger.error(e instanceof Error ? e.stack || e.message : String(e));
            }
        });
    }

    private refresh(editor: TextEditor) {
        const decorationOperator = this.decorationOperatorFactory.createForVisibleEditors();
        decorationOperator.refreshDecorations();
    }

    private refreshNearby(editor: TextEditor) {
        const decorationOperator = this.decorationOperatorFactory.create([editor]);
        decorationOperator.refreshNearbyDecorations();
    }

}
