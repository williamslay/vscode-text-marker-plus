import {mockType} from '../helpers/mock';

import ColourRegistry from '../../lib/colour-registry';
import ConfigStore from '../../lib/config-store';
import * as assert from 'assert';

suite('ColourRegistry', () => {

    suite('When at least 1 colour is registered', () => {
        let configStore;
        let colourRegistry: ColourRegistry;

        setup(() => {
            configStore = {highlightColors: ['COLOUR_1']} as ConfigStore;
            colourRegistry = new ColourRegistry(configStore);
        });

        test('it returns a color which has not been used', () => {
            assert.deepEqual(colourRegistry.issue(), 'COLOUR_1');
        });

        test('it releases the given colour and make it available', () => {
            colourRegistry.issue();
            colourRegistry.revoke('COLOUR_1');

            assert.deepEqual(colourRegistry.issue(), 'COLOUR_1');
        });

        test('it cycles through configured colors after all colors are used', () => {
            const configStore = mockType<ConfigStore>({
                highlightColors: ['COLOUR_1'],
                userColor: ['COLOUR_2', 'COLOUR_3'],
                useUserColor: true
            });
            const registry = new ColourRegistry(configStore);

            assert.deepEqual(registry.issue(), 'COLOUR_1');
            assert.deepEqual(registry.issue(), 'COLOUR_2');
            assert.deepEqual(registry.issue(), 'COLOUR_3');
            assert.deepEqual(registry.issue(), 'COLOUR_1');
            assert.deepEqual(registry.issue(), 'COLOUR_2');
        });

        test('it ignores user colors when the switch is disabled', () => {
            const configStore = mockType<ConfigStore>({
                highlightColors: ['COLOUR_1'],
                userColor: ['USER_COLOUR'],
                useUserColor: false
            });
            const registry = new ColourRegistry(configStore);

            assert.deepEqual(registry.issue(), 'COLOUR_1');
            assert.deepEqual(registry.issue(), 'COLOUR_1');
        });

        test('it skips missing user colors when the switch is enabled', () => {
            const configStore = mockType<ConfigStore>({
                highlightColors: ['COLOUR_1'],
                useUserColor: true
            });
            const registry = new ColourRegistry(configStore);

            assert.deepEqual(registry.issue(), 'COLOUR_1');
            assert.deepEqual(registry.issue(), 'COLOUR_1');
        });
    });

    suite('When no colours are left unused', () => {
        const configStore = mockType<ConfigStore>({
            highlightColors: [],
            userColor: ['DEFAULT_COLOUR'],
            useUserColor: true
        });
        const colourRegistry = new ColourRegistry(configStore);

        test('it issues the user specified default colour', () => {
            assert.deepEqual(colourRegistry.issue(), 'DEFAULT_COLOUR');
        });
    });
});
