import * as assert from 'assert';
import StringPattern from '../../../lib/pattern/string';
import RegexPattern from '../../../lib/pattern/regex';
import {FullMatchRequest, FullMatchWorkerService, MatchWorker, patternFor} from '../../../lib/matching/full-match-service';
import {WorkerRequest} from '../../../lib/matching/worker-matcher';
import {matchText} from '../../../lib/matching/worker-matcher';

suite('FullMatchWorkerService', () => {
    test('matches with existing string and regex semantics', () => {
        const stringPattern = new StringPattern({phrase: 'Foo', ignoreCase: true, wholeMatch: true});
        const regexPattern = new RegexPattern({phrase: 'foo+', ignoreCase: true});
        assert.deepEqual(matchText('a FOO fooo x', patternFor(stringPattern)), stringPattern.locateIn('a FOO fooo x'));
        assert.deepEqual(matchText('a FOO fooo x', patternFor(regexPattern)), regexPattern.locateIn('a FOO fooo x'));
    });

    test('caches complete results by document and pattern identity', async () => {
        const worker = new FakeWorker();
        const service = new FullMatchWorkerService(() => worker);
        const request = createRequest('URI', 4, new StringPattern({phrase: 'TEXT'}));

        const first = service.match(request);
        const second = service.match(request);
        assert.deepEqual(await first, [{start: 0, end: 4}]);
        assert.deepEqual(await second, [{start: 0, end: 4}]);
        assert.equal(worker.postCount, 1);
        service.dispose();
    });

    test('does not reuse result across document versions or pattern fingerprints', async () => {
        const worker = new FakeWorker();
        const service = new FullMatchWorkerService(() => worker);
        await service.match(createRequest('URI', 1, new StringPattern({phrase: 'TEXT'})));
        await service.match(createRequest('URI', 2, new StringPattern({phrase: 'TEXT'})));
        await service.match(createRequest('URI', 2, new StringPattern({phrase: 'OTHER'})));

        assert.equal(worker.postCount, 3);
        service.dispose();
    });

    function createRequest(uri: string, version: number, pattern: StringPattern): FullMatchRequest {
        return {uri, version, text: 'TEXT', pattern: patternFor(pattern)};
    }
});

class FakeWorker implements MatchWorker {
    postCount = 0;
    private messageHandler?: (message: unknown) => void;

    postMessage(request: WorkerRequest): void {
        this.postCount += 1;
        const ranges = matchText(request.text, request.pattern);
        if (this.messageHandler) this.messageHandler({requestId: request.requestId, ranges});
    }

    on(event: string, listener: (...args: unknown[]) => void): MatchWorker {
        if (event === 'message') this.messageHandler = listener;
        return this;
    }

    terminate(): Promise<number> {
        return Promise.resolve(0);
    }
}
