import {any, mockMethods, verify, when} from '../helpers/mock';

import ConfigStore from '../../lib/config-store';
import * as vscode from 'vscode';
import * as assert from 'assert';
import {none} from 'fp-ts/lib/Option';

suite('ConfigStore', () => {
    let extensionConfig: any;
    let configStore: any;
    let workspace: any;

    setup(() => {
        extensionConfig = mockMethods<vscode.WorkspaceConfiguration>(['get', 'update', 'inspect']);
        when(extensionConfig.get('CONFIG_NAME')).thenReturn('CONFIG_VALUE');

        workspace = mockMethods<typeof vscode.workspace>(['getConfiguration']);
        when(workspace.getConfiguration('textmarker')).thenReturn(extensionConfig);

        configStore = new ConfigStore(workspace);
    });

    test('it returns the current config from vscode.workspace', () => {
        assert.deepEqual(configStore.get('CONFIG_NAME'), 'CONFIG_VALUE');
    });

    test('it sets a config value for the resolved location', async () => {
        workspace.workspaceFolders = [{}, {}];
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('global');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Global));
    });

    test('it saves directly to global settings', async () => {
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('global');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Global));
    });

    test('it saves directly to workspace settings when workspace is open', async () => {
        workspace.workspaceFolders = [{}, {}];
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('workspace');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Workspace));
    });

    test('it saves to global settings when the workspace target is configured without open workspace', async () => {
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('workspace');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Global));
    });

    test('it saves to workspace settings for a legacy prompt value when workspace is open', async () => {
        workspace.workspaceFolders = [{}, {}];
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('prompt');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Workspace));
    });

    test('it saves to workspace settings for an unrecognised value when workspace is open', async () => {
        workspace.workspaceFolders = [{}, {}];
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('NOT_A_TARGET');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Workspace));
    });

    test('it saves to global settings on the web host with a virtual workspace', async () => {
        workspace.workspaceFolders = [{uri: {scheme: 'vscode-vfs'}}];
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('workspace');
        const webConfigStore = new ConfigStore(workspace, true);

        await webConfigStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Global));
    });

    test('it saves to workspace settings on the web host with a browser local folder', async () => {
        workspace.workspaceFolders = [{uri: {scheme: 'file'}}];
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('workspace');
        const webConfigStore = new ConfigStore(workspace, true);

        await webConfigStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Workspace));
    });

    test('it saves to global settings on the web host when no workspace folder is open', async () => {
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('workspace');
        const webConfigStore = new ConfigStore(workspace, true);

        await webConfigStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Global));
    });

    test('it keeps workspace settings for a remote scheme outside the web host', async () => {
        workspace.workspaceFolders = [{uri: {scheme: 'vscode-remote'}}];
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('workspace');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Workspace));
    });

    test('it writes to the workspace scope that holds the saved value', async () => {
        when(extensionConfig.inspect('CONFIG_NAME')).thenReturn({workspaceValue: 'SAVED_VALUE'});

        await configStore.setInOwningScope('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Workspace));
    });

    test('it writes to the global scope that holds the saved value', async () => {
        when(extensionConfig.inspect('CONFIG_NAME')).thenReturn({globalValue: 'SAVED_VALUE'});

        await configStore.setInOwningScope('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Global));
    });

    test('it writes to the workspace folder scope when it holds the saved value', async () => {
        when(extensionConfig.inspect('CONFIG_NAME')).thenReturn({workspaceFolderValue: 'SAVED_VALUE', workspaceValue: 'SAVED_VALUE'});

        await configStore.setInOwningScope('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.WorkspaceFolder));
    });

    test('it skips the write when only the default value exists', async () => {
        when(extensionConfig.inspect('CONFIG_NAME')).thenReturn({key: 'CONFIG_NAME', default: 'DEFAULT_VALUE'});

        const result = await configStore.setInOwningScope('CONFIG_NAME', 'CONFIG_VALUE')();

        assert.deepEqual(result, none);
        verify(extensionConfig.update(any(), any(), any()), {times: 0});
    });
});
