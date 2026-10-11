import DecorationEntryFormatter from '../decoration/decoration-entry-formatter';
import ConfigStore from '../config-store';
import DecorationRegistry from '../decoration/decoration-registry';
import WindowComponent from '../vscode/window';
import {CommandLike} from '../vscode/vscode';

export default class SaveAllHighlightsCommand implements CommandLike {
    private readonly configStore: ConfigStore;
    private readonly decorationRegistry: DecorationRegistry;
    private readonly windowComponent: WindowComponent;
    private readonly decorationEntryFormatter: DecorationEntryFormatter;

    constructor(configStore: ConfigStore, decorationRegistry: DecorationRegistry, windowComponent: WindowComponent) {
        this.configStore = configStore;
        this.decorationRegistry = decorationRegistry;
        this.windowComponent = windowComponent;

        this.decorationEntryFormatter = new DecorationEntryFormatter();
    }

    async execute() {
        const decorations = this.decorationRegistry.retrieveAll()
            .map(decoration => this.decorationEntryFormatter.format(decoration));
        try {
            await this.configStore.set('savedHighlights', decorations)();
        } catch (error) {
            // VS Code passes `donotNotifyError` when an extension updates a setting, so a
            // rejected write is silent unless this command reports it.
            const message = error instanceof Error ? error.message : String(error);
            // A message promise resolves only when the user dismisses the notification, so it
            // is deliberately not awaited here: the command must finish while it stays open.
            this.windowComponent.showErrorMessage(`Failed to save highlights: ${message}`)().catch(() => undefined);
        }
    }
}
