import DecorationOperatorFactory from '../decoration/decoration-operator-factory';
import ConfigStore from '../config-store';
import {CommandLike} from '../vscode/vscode';

export default class RemoveAllHighlightsCommand implements CommandLike {
    private readonly decorationOperatorFactory: DecorationOperatorFactory;
    private readonly configStore: ConfigStore;

    constructor(decorationOperatorFactory: DecorationOperatorFactory, configStore: ConfigStore) {
        this.decorationOperatorFactory = decorationOperatorFactory;
        this.configStore = configStore;
    }

    execute() {
        const decorationOperator = this.decorationOperatorFactory.createForVisibleEditors();
        decorationOperator.removeAllDecorations();
        return this.configStore.setInOwningScope('savedHighlights', [])();
    }

}
