import * as assert from 'assert';
import CommandFactory from '../../../lib/command-factory';
import {FullMatchService, InlineMatchService} from '../../../lib/matching/full-match-service';
import {Logger} from '../../../lib/Logger';
import {mockMethods} from '../../helpers/mock';

suite('CommandFactory full match service', () => {
    const logger = mockMethods<Logger>(['error', 'warn']);

    test('defaults to inline matching when no match service factory is injected', () => {
        const factory = new CommandFactory({}, logger);

        assert.ok(factory.getFullMatchService() instanceof InlineMatchService);
    });

    test('uses the injected match service factory once and memoises the result', () => {
        const injected = new InlineMatchService();
        let createCount = 0;
        const factory = new CommandFactory({}, logger, () => {
            createCount += 1;
            return injected;
        });

        assert.equal(factory.getFullMatchService(), injected);
        assert.equal(factory.getFullMatchService(), injected);
        assert.equal(createCount, 1);
    });

    test('dispose releases the memoised match service', () => {
        let disposeCount = 0;
        const service: FullMatchService = {
            match: () => Promise.resolve([]),
            dispose: () => {
                disposeCount += 1;
            }
        };
        const factory = new CommandFactory({}, logger, () => service);
        factory.dispose();
        assert.equal(disposeCount, 0);

        factory.getFullMatchService();
        factory.dispose();
        assert.equal(disposeCount, 1);
    });
});
