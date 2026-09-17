import {CommandLike} from '../vscode/vscode';
import {Logger} from '../Logger';
import * as vscode from 'vscode';
import TextEditor from '../vscode/text-editor';

class CommandWrapper {
    private readonly command: CommandLike;
    private readonly logger: Logger;

    constructor(command: CommandLike, logger: Logger) {
        this.command = command;
        this.logger = logger;
    }

    async execute(vsEditor?: vscode.TextEditor) {
        try {
            const editor = vsEditor && new TextEditor(vsEditor);
            return await this.command.execute(editor);
        } catch (e) {
            this.logger.error(e instanceof Error ? e.stack || e.message : String(e));
        }
    }

    refreshVisibleEditors() {
        try {
            if (this.command.refreshVisibleEditors) this.command.refreshVisibleEditors();
        } catch (e) {
            this.logger.error(e instanceof Error ? e.stack || e.message : String(e));
        }
    }

}

export class ManualTriggerCommand extends CommandWrapper {
}

export class AutoTriggerCommand extends CommandWrapper {
}
