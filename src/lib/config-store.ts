import * as O from 'fp-ts/lib/Option';
import {getOptionM} from 'fp-ts/lib/OptionT';
import {task, Task} from 'fp-ts/lib/Task';
import * as vscode from 'vscode';
import * as Const from './const';
import {Highlight} from './entities/highlight';

export type SaveTarget = 'workspace' | 'global';

export default class ConfigStore {
    private readonly workspace: typeof vscode.workspace;
    private readonly isWebHost: boolean;

    constructor(workspace: typeof vscode.workspace, isWebHost = false) {
        this.workspace = workspace;
        this.isWebHost = isWebHost;
    }

    get highlightColors() {
        return this.get<string[]>('highlightColors');
    }

    get userColor() {
        return this.get<string[]>('userColor');
    }

    get useUserColor() {
        return this.get<boolean>('useUserColor');
    }

    get defaultHighlightOpacity() {
        return this.get<number>('defaultHighlightOpacity');
    }

    get savedHighlights() {
        return this.get<Highlight[]>('savedHighlights');
    }

    get useHighlightColorOnRuler() {
        return this.get<boolean>('useHighlightColorOnRuler');
    }

    get autoSelectDistinctiveTextColor() {
        return this.get<boolean>('autoSelectDistinctiveTextColor');
    }

    get enableIgnoreCase() {
        return this.get<boolean>('enableIgnoreCase');
    }

    get enableWholeMatch() {
        return this.get<boolean>('enableWholeMatch');
    }

    get hideStatusBarItems() {
        return this.get<boolean>('hideStatusBarItems');
    }

    get defaultSaveTarget() {
        return this.get<SaveTarget>('defaultSaveTarget');
    }

    get autoSaveOnToggle() {
        return this.get<boolean>('autoSaveOnToggle');
    }

    private get<T>(configName: string) {
        const extensionConfig = this.workspace.getConfiguration(Const.EXTENSION_ID);
        return extensionConfig.get(configName) as T;
    }

    set(configName: string, configValue: any): Task<O.Option<never>> {
        return getOptionM(task).chain(this.resolveSaveTarget(), target => {
            const extensionConfig = this.workspace.getConfiguration(Const.EXTENSION_ID);
            return () => extensionConfig.update(configName, configValue, target) as Promise<O.Option<never>>;
        });
    }

    // Writes to the configuration scope that actually owns the value, instead of the scope
    // chosen by `defaultSaveTarget`. VS Code replaces array-valued settings across scopes
    // rather than merging them, so writing to a scope that does not hold the value only
    // masks the rules that live somewhere else.
    setInOwningScope(configName: string, configValue: any): Task<O.Option<never>> {
        return getOptionM(task).chain(this.resolveOwningScope(configName), target => {
            const extensionConfig = this.workspace.getConfiguration(Const.EXTENSION_ID);
            return () => extensionConfig.update(configName, configValue, target) as Promise<O.Option<never>>;
        });
    }

    private resolveSaveTarget(): Task<O.Option<vscode.ConfigurationTarget>> {
        switch (this.defaultSaveTarget) {
            case 'global':
                return task.of(O.some(vscode.ConfigurationTarget.Global));
            case 'workspace':
            // A legacy or invalid value, for example "prompt" stored by an older
            // version, is handled the same way as `workspace`.
            default: {
                const workspaceFolders = this.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    return task.of(O.some(vscode.ConfigurationTarget.Global));
                }
                if (this.isWebHost && !this.hasDiskBackedWorkspace(workspaceFolders)) {
                    // A virtual workspace (for example vscode-vfs on vscode.dev) keeps a
                    // workspace settings write as an uncommitted change in browser storage,
                    // which is lost on window reload. Global settings live in the browser
                    // profile, so use them to keep highlights across reloads.
                    return task.of(O.some(vscode.ConfigurationTarget.Global));
                }
                return task.of(O.some(vscode.ConfigurationTarget.Workspace));
            }
        }
    }

    private resolveOwningScope(configName: string): Task<O.Option<vscode.ConfigurationTarget>> {
        const inspected = this.workspace.getConfiguration(Const.EXTENSION_ID).inspect(configName);
        if (!inspected) return task.of(O.none);
        if (inspected.workspaceFolderValue !== undefined) return task.of(O.some(vscode.ConfigurationTarget.WorkspaceFolder));
        if (inspected.workspaceValue !== undefined) return task.of(O.some(vscode.ConfigurationTarget.Workspace));
        if (inspected.globalValue !== undefined) return task.of(O.some(vscode.ConfigurationTarget.Global));
        // Nothing was saved by the user, only the declared default exists. Writing here
        // would add an empty entry to settings that has nothing to clear.
        return task.of(O.none);
    }

    private hasDiskBackedWorkspace(workspaceFolders: readonly vscode.WorkspaceFolder[]): boolean {
        return workspaceFolders.every(folder => folder.uri.scheme === 'file');
    }
}
