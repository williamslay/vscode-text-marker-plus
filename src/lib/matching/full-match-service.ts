import * as path from 'path';
import * as fs from 'fs';
import {Worker} from 'worker_threads';
import {FlatRange} from '../vscode/flat-range';
import Pattern from '../pattern/pattern';
import {matchText, WorkerPattern, WorkerRequest, WorkerResponse} from './worker-matcher';

export type FullMatchRequest = {
    uri: string;
    version: number;
    text: string;
    pattern: WorkerPattern;
};

export interface FullMatchService {
    match(request: FullMatchRequest): Promise<FlatRange[]>;
    dispose(): void;
}

export interface MatchWorker {
    postMessage(message: WorkerRequest): void;
    on(event: string, listener: (...args: unknown[]) => void): MatchWorker;
    terminate(): Promise<number>;
    unref?: () => void;
}

type PendingMatch = {
    cacheKey: string;
    requestKey: string;
    uri: string;
    version: number;
    resolve: (ranges: FlatRange[]) => void;
    reject: (error: Error) => void;
};

export type FullMatchCacheOptions = {
    readonly maxEntries?: number;
    readonly maxRanges?: number;
};

type CacheEntry = {
    readonly uri: string;
    readonly version: number;
    readonly ranges: FlatRange[];
};

const DEFAULT_MAX_CACHE_ENTRIES = 128;
const DEFAULT_MAX_CACHED_RANGES = 100000;

export function patternFor(pattern: Pattern): WorkerPattern {
    return {
        type: pattern.type,
        phrase: pattern.phrase,
        ignoreCase: pattern.ignoreCase,
        wholeMatch: pattern.wholeMatch
    };
}

export function patternFingerprint(pattern: WorkerPattern): string {
    return JSON.stringify([
        pattern.type,
        pattern.phrase,
        pattern.ignoreCase,
        pattern.wholeMatch
    ]);
}

export class InlineMatchService implements FullMatchService {
    match(request: FullMatchRequest): Promise<FlatRange[]> {
        return Promise.resolve(matchText(request.text, request.pattern));
    }

    dispose(): void {
        return;
    }
}

export class FullMatchWorkerService implements FullMatchService {
    private readonly worker: MatchWorker;
    private readonly cache: Map<string, CacheEntry>;
    private readonly pending: Map<number, PendingMatch>;
    private readonly pendingByKey: Map<string, Promise<FlatRange[]>>;
    private readonly latestVersionByKey: Map<string, number>;
    private readonly maxCacheEntries: number;
    private readonly maxCachedRanges: number;
    private nextRequestId: number;
    private cachedRangeCount: number;
    private disposed: boolean;

    constructor(createWorker: () => MatchWorker = createDefaultWorker,
                options: FullMatchCacheOptions = {}) {
        this.worker = createWorker();
        if (this.worker.unref) this.worker.unref();
        this.cache = new Map();
        this.pending = new Map();
        this.pendingByKey = new Map();
        this.latestVersionByKey = new Map();
        this.maxCacheEntries = options.maxEntries || DEFAULT_MAX_CACHE_ENTRIES;
        this.maxCachedRanges = options.maxRanges || DEFAULT_MAX_CACHED_RANGES;
        this.nextRequestId = 0;
        this.cachedRangeCount = 0;
        this.disposed = false;
        this.worker.on('message', message => this.handleMessage(message));
        this.worker.on('error', (...args: unknown[]) => {
            const error = args[0];
            this.failPending(error instanceof Error ? error : new Error(String(error)));
        });
        this.worker.on('exit', (...args: unknown[]) => {
            const code = args[0];
            if (typeof code === 'number' && code !== 0 && !this.disposed) {
                this.failPending(new Error(`Full match worker exited with code ${code}`));
            }
        });
    }

    match(request: FullMatchRequest): Promise<FlatRange[]> {
        if (this.disposed) return Promise.reject(new Error('Full match service is disposed'));
        const cacheKey = this.getCacheKey(request);
        this.recordLatestVersion(cacheKey, request.version);
        const cached = this.cache.get(cacheKey);
        if (cached && cached.version === request.version) {
            this.touchCacheEntry(cacheKey, cached);
            return Promise.resolve(this.copyRanges(cached.ranges));
        }
        if (cached && cached.version < request.version) {
            this.deleteCacheEntry(cacheKey);
        }
        const requestKey = this.getRequestKey(cacheKey, request.version);
        const existing = this.pendingByKey.get(requestKey);
        if (existing) return existing;

        const requestId = this.nextRequestId++;
        const promise = new Promise<FlatRange[]>((resolve, reject) => {
            this.pending.set(requestId, {
                cacheKey,
                requestKey,
                uri: request.uri,
                version: request.version,
                resolve,
                reject
            });
        });
        this.pendingByKey.set(requestKey, promise);
        try {
            this.worker.postMessage({requestId, pattern: request.pattern, text: request.text});
        } catch (error) {
            const pending = this.pending.get(requestId);
            this.pending.delete(requestId);
            this.pendingByKey.delete(requestKey);
            const pendingError = error instanceof Error ? error : new Error(String(error));
            if (pending) {
                pending.reject(pendingError);
                this.removeUnusedVersion(cacheKey);
            }
        }
        return promise;
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const error = new Error('Full match service is disposed');
        this.failPending(error);
        this.cache.clear();
        this.latestVersionByKey.clear();
        this.cachedRangeCount = 0;
        void this.worker.terminate();
    }

    private getCacheKey(request: FullMatchRequest): string {
        return `${request.uri}\u0000${patternFingerprint(request.pattern)}`;
    }

    private getRequestKey(cacheKey: string, version: number): string {
        return `${cacheKey}\u0000${version}`;
    }

    private handleMessage(value: unknown): void {
        if (!isWorkerResponse(value)) return;
        const pending = this.pending.get(value.requestId);
        if (!pending) return;
        this.pending.delete(value.requestId);
        this.pendingByKey.delete(pending.requestKey);
        if ('error' in value) {
            pending.reject(new Error(value.error));
            this.removeUnusedVersion(pending.cacheKey);
            return;
        }
        if (this.latestVersionByKey.get(pending.cacheKey) === pending.version) {
            this.storeCacheEntry(pending.cacheKey, pending.uri, pending.version, value.ranges);
        }
        this.removeUnusedVersion(pending.cacheKey);
        pending.resolve(this.copyRanges(value.ranges));
    }

    private failPending(error: Error): void {
        this.pending.forEach(item => item.reject(error));
        this.pending.clear();
        this.pendingByKey.clear();
    }

    private recordLatestVersion(cacheKey: string, version: number): void {
        const latestVersion = this.latestVersionByKey.get(cacheKey);
        if (latestVersion === undefined || version > latestVersion) {
            this.latestVersionByKey.set(cacheKey, version);
        }
    }

    private storeCacheEntry(key: string, uri: string, version: number, ranges: FlatRange[]): void {
        if (ranges.length > this.maxCachedRanges) return;
        this.deleteCacheEntry(key);
        this.cache.set(key, {uri, version, ranges});
        this.cachedRangeCount += ranges.length;
        this.enforceCacheLimits();
    }

    private removeUnusedVersion(cacheKey: string): void {
        if (this.cache.has(cacheKey)) return;
        for (const pending of this.pending.values()) {
            if (pending.cacheKey === cacheKey) return;
        }
        this.latestVersionByKey.delete(cacheKey);
    }

    private touchCacheEntry(key: string, entry: CacheEntry): void {
        this.cache.delete(key);
        this.cache.set(key, entry);
    }

    private enforceCacheLimits(): void {
        while (this.cache.size > this.maxCacheEntries || this.cachedRangeCount > this.maxCachedRanges) {
            const oldest = this.cache.keys().next();
            if (oldest.done) return;
            this.deleteCacheEntry(oldest.value);
        }
    }

    private deleteCacheEntry(key: string): void {
        const entry = this.cache.get(key);
        if (!entry) return;
        this.cache.delete(key);
        this.cachedRangeCount -= entry.ranges.length;
    }

    private copyRanges(ranges: FlatRange[]): FlatRange[] {
        return ranges.map(range => ({start: range.start, end: range.end}));
    }
}

function createDefaultWorker(): MatchWorker {
    const localPath = path.join(__dirname, 'full-match-worker.js');
    const compiledPath = path.resolve(__dirname, '../../../out/lib/matching/full-match-worker.js');
    const workerPath = fs.existsSync(localPath) ? localPath : compiledPath;
    return new Worker(workerPath);
}

function isWorkerResponse(value: unknown): value is WorkerResponse {
    if (!isRecord(value) || typeof value.requestId !== 'number') return false;
    if ('error' in value) return typeof value.error === 'string';
    return Array.isArray(value.ranges);
}

function isRecord(value: unknown): value is {[key: string]: unknown} {
    return typeof value === 'object' && value !== null;
}
