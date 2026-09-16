import {mock, mockMethods, verify, when} from '../helpers/mock';

import ConfigStore from '../../lib/config-store';
import * as vscode from 'vscode';
import ConfigurationTargetPicker from '../../lib/config-target-picker';
import * as assert from 'assert';
import {some} from 'fp-ts/lib/Option';
import {task} from 'fp-ts/lib/Task';

suite('ConfigStore', () => {
    let extensionConfig: any;
    let configStore: any;
    let workspace: any;
    let configTargetPicker: any;

    setup(() => {
        extensionConfig = mockMethods<vscode.WorkspaceConfiguration>(['get', 'update']);
        when(extensionConfig.get('CONFIG_NAME')).thenReturn('CONFIG_VALUE');

        workspace = mockMethods<typeof vscode.workspace>(['getConfiguration']);
        when(workspace.getConfiguration('textmarker')).thenReturn(extensionConfig);

        configTargetPicker = mock(ConfigurationTargetPicker);
        when(configTargetPicker.pick()).thenReturn(task.of(some('CONFIG_TARGET')));

        configStore = new ConfigStore(workspace, configTargetPicker);
    });

    test('it returns the current config from vscode.workspace', () => {
        assert.deepEqual(configStore.get('CONFIG_NAME'), 'CONFIG_VALUE');
    });

    test('it sets a config value for the specified location', async () => {
        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', 'CONFIG_TARGET'));
    });

    test('it saves directly to global settings', async () => {
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('global');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(configTargetPicker.pick(), {times: 0});
        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Global));
    });

    test('it saves directly to workspace settings when workspace is open', async () => {
        workspace.workspaceFolders = [{}, {}];
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('workspace');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(configTargetPicker.pick(), {times: 0});
        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', vscode.ConfigurationTarget.Workspace));
    });

    test('it prompts when workspace target is configured without open workspace', async () => {
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('workspace');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(configTargetPicker.pick());
        verify(extensionConfig.update('CONFIG_NAME', 'CONFIG_VALUE', 'CONFIG_TARGET'));
    });

    test('it prompts when prompt target is configured', async () => {
        when(extensionConfig.get('defaultSaveTarget')).thenReturn('prompt');

        await configStore.set('CONFIG_NAME', 'CONFIG_VALUE')();

        verify(configTargetPicker.pick());
    });
});
