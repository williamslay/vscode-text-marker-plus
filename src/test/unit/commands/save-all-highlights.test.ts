import {any, mock, mockMethods, verify, when} from '../../helpers/mock';
import SaveAllHighlightsCommand from '../../../lib/commands/save-all-highlights';
import DecorationRegistry from '../../../lib/decoration/decoration-registry';
import ConfigStore from '../../../lib/config-store';
import WindowComponent from '../../../lib/vscode/window';
import {task} from 'fp-ts/lib/Task';
import {none} from 'fp-ts/lib/Option';

suite('SaveAllHighlightsCommand', () => {
    let command: SaveAllHighlightsCommand;
    let configStore: ConfigStore;
    let windowComponent: WindowComponent;
    const decorations = [{
        id: 'ID1',
        colour: 'COLOUR1',
        pattern: {
            type: 'String',
            phrase: 'PHRASE',
            ignoreCase: 'IGNORE_CASE',
            wholeMatch: 'WHOLE_MATCH'
        }
    }, {
        id: 'ID2',
        colour: 'COLOUR2',
        pattern: {
            type: 'RegExp',
            phrase: 'PHRASE',
            ignoreCase: 'IGNORE_CASE',
            wholeMatch: 'WHOLE_MATCH'
        }
    }];

    const decorationRegistry = mock(DecorationRegistry);
    when(decorationRegistry.retrieveAll()).thenReturn(decorations);

    configStore = mockMethods<ConfigStore>(['set'], {savedHighlights: [{}, {}], defaultSaveTarget: 'workspace'});
    when(configStore.set('savedHighlights', [{
        pattern: {
            type: 'string',
            expression: 'PHRASE',
            ignoreCase: 'IGNORE_CASE',
            wholeMatch: 'WHOLE_MATCH'
        },
        color: 'COLOUR1'
    }, {
        pattern: {
            type: 'regex',
            expression: 'PHRASE',
            ignoreCase: 'IGNORE_CASE',
            wholeMatch: 'WHOLE_MATCH'
        },
        color: 'COLOUR2'
    }])).thenReturn(task.of(none));

    windowComponent = mockMethods<WindowComponent>(['showErrorMessage', 'showInformationMessage']);

    command = new SaveAllHighlightsCommand(configStore, decorationRegistry, windowComponent);

    test('it saves highlight into config', async () => {
        await command.execute();

        verify(windowComponent.showErrorMessage(any()), {times: 0});
        verify(windowComponent.showInformationMessage(any()), {times: 0});
    });

    test('it reports a failed write to the user', async () => {
        const failingStore = mockMethods<ConfigStore>(['set'], {savedHighlights: []});
        when(failingStore.set('savedHighlights', any()))
            .thenReturn(() => Promise.reject(new Error('Unable to write settings')));
        const windowDouble = mockMethods<WindowComponent>(['showErrorMessage', 'showInformationMessage']);
        when(windowDouble.showErrorMessage(any())).thenReturn(task.of('OK'));
        const failingCommand = new SaveAllHighlightsCommand(failingStore, decorationRegistry, windowDouble);

        await failingCommand.execute();

        verify(windowDouble.showErrorMessage('Failed to save highlights: Unable to write settings'), {times: 1});
        verify(windowDouble.showInformationMessage(any()), {times: 0});
    });
});
