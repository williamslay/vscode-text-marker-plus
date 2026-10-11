import {any, mock, verify, when} from '../../helpers/mock';
import RemoveAllHighlightsCommand from '../../../lib/commands/remove-all-highlights';
import DecorationOperatorFactory from '../../../lib/decoration/decoration-operator-factory';
import DecorationOperator from '../../../lib/decoration/decoration-operator';
import ConfigStore from '../../../lib/config-store';
import {task} from 'fp-ts/lib/Task';
import {none} from 'fp-ts/lib/Option';

suite('RemoveAllHighlightsCommand', () => {
    const decorationOperator = mock(DecorationOperator);
    const decorationOperatorFactory = mock(DecorationOperatorFactory);
    when(decorationOperatorFactory.createForVisibleEditors()).thenReturn(decorationOperator);

    const configStore = mock(ConfigStore);
    when(configStore.setInOwningScope('savedHighlights', [])).thenReturn(task.of(none));

    test('it lets DecorationOperator to remove all decorations', () => {
        new RemoveAllHighlightsCommand(decorationOperatorFactory, configStore).execute();

        verify(decorationOperator.removeAllDecorations());
    });

    test('it saves an empty highlight list into the config scope that owns the value', () => {
        new RemoveAllHighlightsCommand(decorationOperatorFactory, configStore).execute();

        verify(configStore.setInOwningScope('savedHighlights', []));
    });

    test('it does not use the configured save target when persisting', async () => {
        const command = new RemoveAllHighlightsCommand(decorationOperatorFactory, configStore);

        await command.execute();

        verify(configStore.setInOwningScope('savedHighlights', []));
        verify(configStore.set(any(), any()), {times: 0});
    });

});
