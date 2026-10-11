import * as assert from 'assert';
import StringPattern from '../../../lib/pattern/string';
import RegexPattern from '../../../lib/pattern/regex';
import Pattern from '../../../lib/pattern/pattern';
import {FullMatchRequest, InlineMatchService, patternFor} from '../../../lib/matching/full-match-service';

suite('InlineMatchService', () => {
    const service = new InlineMatchService();

    test('resolves ranges for a string pattern ignoring case', async () => {
        const ranges = await service.match(createRequest('TEXT OTHER TEXT', new StringPattern({phrase: 'text', ignoreCase: true})));

        assert.deepEqual(ranges, [{start: 0, end: 4}, {start: 11, end: 15}]);
    });

    test('resolves only whole words for a string pattern with whole match', async () => {
        const ranges = await service.match(createRequest('TEXTUAL TEXT', new StringPattern({phrase: 'TEXT', wholeMatch: true})));

        assert.deepEqual(ranges, [{start: 8, end: 12}]);
    });

    test('resolves ranges for a regex pattern ignoring case', async () => {
        const ranges = await service.match(createRequest('a FOO fooo x', new RegexPattern({phrase: 'foo+', ignoreCase: true})));

        assert.deepEqual(ranges, [{start: 2, end: 5}, {start: 6, end: 10}]);
    });

    test('resolves only whole words for a regex pattern with whole match', async () => {
        const ranges = await service.match(createRequest('foo foobar', new RegexPattern({phrase: 'foo', wholeMatch: true})));

        assert.deepEqual(ranges, [{start: 0, end: 3}]);
    });

    function createRequest(text: string, pattern: Pattern): FullMatchRequest {
        return {uri: 'URI', version: 1, text, pattern: patternFor(pattern)};
    }
});
