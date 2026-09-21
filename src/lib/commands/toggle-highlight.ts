import DecorationOperatorFactory from '../decoration/decoration-operator-factory';
import PatternFactory from '../pattern/pattern-factory';
import TextLocationRegistry from '../text-location-registry';
import TextEditor from '../vscode/text-editor';
import {CommandLike} from '../vscode/vscode';
import MatchingModeRegistry from '../matching-mode-registry';
import DecorationRegistry from '../decoration/decoration-registry';
import WindowComponent from '../vscode/window';
import {DecorationTypeRegistry} from '../decoration/decoration-type-registry';
import * as O from 'fp-ts/lib/Option';
import ConfigStore from '../config-store';
import SaveAllHighlightsCommand from './save-all-highlights';

export default class ToggleHighlightCommand implements CommandLike {
    private readonly decorationOperatorFactory: DecorationOperatorFactory;
    private readonly patternFactory: PatternFactory;
    private readonly textLocationRegistry: TextLocationRegistry;
    private readonly windowComponent: WindowComponent;
    private readonly configStore?: ConfigStore;
    private readonly saveAllHighlightsCommand?: SaveAllHighlightsCommand;

    constructor(matchingModeRegistry: MatchingModeRegistry,
                textLocationRegistry: TextLocationRegistry,
                decorationRegistry: DecorationRegistry,
                decorationTypeRegistry: DecorationTypeRegistry,
                windowComponent: WindowComponent,
                configStore?: ConfigStore,
                saveAllHighlightsCommand?: SaveAllHighlightsCommand,
                decorationOperatorFactory?: DecorationOperatorFactory) {
        this.decorationOperatorFactory = decorationOperatorFactory ||
            new DecorationOperatorFactory(decorationRegistry, decorationTypeRegistry, textLocationRegistry, windowComponent);
        this.patternFactory = new PatternFactory(matchingModeRegistry);
        this.textLocationRegistry = textLocationRegistry;
        this.windowComponent = windowComponent;
        this.configStore = configStore;
        this.saveAllHighlightsCommand = saveAllHighlightsCommand;
    }

    async execute(textEditor: TextEditor) {
        const decorationId = this.textLocationRegistry.queryDecorationId(textEditor.id, textEditor.selection, textEditor.version);
        const changed = O.isSome(decorationId) ?
            this.removeDecoration(decorationId.value) :
            await this.addDecoration(textEditor);
        if (changed && this.configStore && this.saveAllHighlightsCommand && this.configStore.autoSaveOnToggle) {
            try {
                await this.saveAllHighlightsCommand.execute();
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                await this.windowComponent.showErrorMessage(`Failed to save highlights: ${message}`)();
            }
        }
    }

    private removeDecoration(decorationId: string): boolean {
        const decorationOperator = this.decorationOperatorFactory.createForVisibleEditors();
        return decorationOperator.removeDecoration(decorationId);
    }

    private async addDecoration(textEditor: TextEditor): Promise<boolean> {
        if (!textEditor.selectedText) return false;
        const pattern = this.patternFactory.create({phrase: textEditor.selectedText});
        const decorationOperator = this.decorationOperatorFactory.createForVisibleEditors();
        const changed = decorationOperator.addDecoration(pattern);
        if (changed) await decorationOperator.waitForFullRefresh();
        return changed;
    }

}
