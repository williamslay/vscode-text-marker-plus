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
    key: string;
    resolve: (ranges: FlatRange[]) => void;
    reject: (error: Error) => void;
};

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
    private readonly cache: Map<string, FlatRange[]>;
    private readonly pending: Map<number, PendingMatch>;
    private readonly pendingByKey: Map<string, Promise<FlatRange[]>>;
    private nextRequestId: number;
    private disposed: boolean;

    constructor(createWorker: () => MatchWorker = createDefaultWorker) {
        this.worker = createWorker();
        if (this.worker.unref) this.worker.unref();
        this.cache = new Map();
        this.pending = new Map();
        this.pendingByKey = new Map();
        this.nextRequestId = 0;
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
        const key = this.getCacheKey(request);
        const cached = this.cache.get(key);
        if (cached) return Promise.resolve(cached.map(range => ({start: range.start, end: range.end})));
        const existing = this.pendingByKey.get(key);
        if (existing) return existing;

        const requestId = this.nextRequestId++;
        const promise = new Promise<FlatRange[]>((resolve, reject) => {
            this.pending.set(requestId, {key, resolve, reject});
        });
        this.pendingByKey.set(key, promise);
        try {
            this.worker.postMessage({requestId, pattern: request.pattern, text: request.text});
        } catch (error) {
            const pending = this.pending.get(requestId);
            this.pending.delete(requestId);
            this.pendingByKey.delete(key);
            const pendingError = error instanceof Error ? error : new Error(String(error));
            if (pending) pending.reject(pendingError);
        }
        return promise;
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const error = new Error('Full match service is disposed');
        this.failPending(error);
        void this.worker.terminate();
    }

    private getCacheKey(request: FullMatchRequest): string {
        return `${request.uri}\u0000${request.version}\u0000${patternFingerprint(request.pattern)}`;
    }

    private handleMessage(value: unknown): void {
        if (!isWorkerResponse(value)) return;
        const pending = this.pending.get(value.requestId);
        if (!pending) return;
        this.pending.delete(value.requestId);
        this.pendingByKey.delete(pending.key);
        if ('error' in value) {
            pending.reject(new Error(value.error));
            return;
        }
        this.cache.set(pending.key, value.ranges);
        pending.resolve(value.ranges.map(range => ({start: range.start, end: range.end})));
    }

    private failPending(error: Error): void {
        this.pending.forEach(item => item.reject(error));
        this.pending.clear();
        this.pendingByKey.clear();
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
