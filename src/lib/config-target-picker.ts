import * as O from 'fp-ts/lib/Option';
import {getOptionM} from 'fp-ts/lib/OptionT';
import {Task, task} from 'fp-ts/lib/Task';
import * as vscode from 'vscode';
import WindowComponent, {QuickPickItem} from './vscode/window';

interface ConfigurationTargetQuickPickItem extends QuickPickItem {
    value: vscode.ConfigurationTarget;
}

export default class ConfigurationTargetPicker {
    private readonly windowComponent: WindowComponent;

    constructor(windowComponent: WindowComponent) {
        this.windowComponent = windowComponent;
    }

    pick(): Task<O.Option<vscode.ConfigurationTarget>> {
        const selectItems = this.buildQuickPickItems();
        const options = {placeHolder: 'Select which scope of settings to save highlights to'};
        const item = this.windowComponent.showQuickPick<ConfigurationTargetQuickPickItem>(selectItems, options);
        return getOptionM(task).map(item, it => it.value);
    }

    private buildQuickPickItems(): ConfigurationTargetQuickPickItem[] {
        return [
            {
                label: 'Global',
                value: vscode.ConfigurationTarget.Global
            },
            {
                label: 'Workspace',
                value: vscode.ConfigurationTarget.Workspace
            }
        ];
    }

}
