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

    test('does not let an older completion replace a newer cached result', async () => {
        const worker = new DeferredWorker();
        const service = new FullMatchWorkerService(() => worker);
        const pattern = new StringPattern({phrase: 'TEXT'});
        const first = service.match(createRequest('URI', 1, pattern));
        const second = service.match(createRequest('URI', 2, pattern));

        worker.resolve(1, [{start: 1, end: 5}]);
        assert.deepEqual(await second, [{start: 1, end: 5}]);
        worker.resolve(0, [{start: 0, end: 4}]);
        await first;

        assert.deepEqual(await service.match(createRequest('URI', 2, pattern)), [{start: 1, end: 5}]);
        assert.equal(worker.postCount, 2);
        service.dispose();
    });

    test('removes obsolete versions for the same document', async () => {
        const worker = new FakeWorker();
        const service = new FullMatchWorkerService(() => worker);
        await service.match(createRequest('URI', 1, new StringPattern({phrase: 'TEXT'})));
        await service.match(createRequest('URI', 2, new StringPattern({phrase: 'TEXT'})));
        await service.match(createRequest('URI', 1, new StringPattern({phrase: 'TEXT'})));

        assert.equal(worker.postCount, 3);
        service.dispose();
    });

    test('evicts least recently used entries when the entry limit is reached', async () => {
        const worker = new FakeWorker();
        const service = new FullMatchWorkerService(() => worker, {
            maxEntries: 2,
            maxRanges: 10
        });
        const pattern = new StringPattern({phrase: 'TEXT'});
        await service.match(createRequest('URI-A', 1, pattern));
        await service.match(createRequest('URI-B', 1, pattern));
        await service.match(createRequest('URI-A', 1, pattern));
        await service.match(createRequest('URI-C', 1, pattern));
        await service.match(createRequest('URI-B', 1, pattern));

        assert.equal(worker.postCount, 4);
        service.dispose();
    });

    test('does not cache results above the range limit', async () => {
        const worker = new FakeWorker();
        const service = new FullMatchWorkerService(() => worker, {
            maxEntries: 2,
            maxRanges: 1
        });
        const request = createRequest('URI', 1, new StringPattern({phrase: 'T'}));
        await service.match(request);
        await service.match(request);

        assert.equal(worker.postCount, 2);
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

class DeferredWorker implements MatchWorker {
    postCount = 0;
    private readonly requests: WorkerRequest[] = [];
    private messageHandler?: (message: unknown) => void;

    postMessage(request: WorkerRequest): void {
        this.postCount += 1;
        this.requests.push(request);
    }

    on(event: string, listener: (...args: unknown[]) => void): MatchWorker {
        if (event === 'message') this.messageHandler = listener;
        return this;
    }

    resolve(index: number, ranges: Array<{start: number; end: number}>): void {
        const request = this.requests[index];
        if (request && this.messageHandler) {
            this.messageHandler({requestId: request.requestId, ranges});
        }
    }

    terminate(): Promise<number> {
        return Promise.resolve(0);
    }
}
