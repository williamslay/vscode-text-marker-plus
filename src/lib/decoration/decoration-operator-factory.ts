import DecorationOperator from './decoration-operator';
import DecorationRegistry from './decoration-registry';
import TextDecorator from './text-decorator';
import WindowComponent from '../vscode/window';
import TextEditor from '../vscode/text-editor';
import TextLocationRegistry from '../text-location-registry';
import {DecorationTypeRegistry} from './decoration-type-registry';
import {FullMatchService} from '../matching/full-match-service';
import {Logger} from '../Logger';

export default class DecorationOperatorFactory {
    private readonly decorationRegistry: DecorationRegistry;
    private readonly textDecorator: TextDecorator;
    private readonly windowComponent: WindowComponent;

    constructor(decorationRegistry: DecorationRegistry,
                decorationTypeRegistry: DecorationTypeRegistry,
                textLocationRegistry: TextLocationRegistry,
                windowComponent: WindowComponent,
                fullMatchService?: FullMatchService,
                logger?: Logger) {
        this.decorationRegistry = decorationRegistry;
        this.textDecorator = new TextDecorator(textLocationRegistry, decorationTypeRegistry, fullMatchService, logger);
        this.windowComponent = windowComponent;
    }

    createForVisibleEditors(): DecorationOperator {
        return this.create(this.windowComponent.visibleTextEditors);
    }

    create(editors: TextEditor[]): DecorationOperator {
        return new DecorationOperator(editors, this.decorationRegistry, this.textDecorator);
    }

}
