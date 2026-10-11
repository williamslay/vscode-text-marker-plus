import * as path from 'path';
import * as fs from 'fs';
import {Worker} from 'worker_threads';
import {FullMatchService, FullMatchWorkerService, MatchWorker} from './full-match-service';
import {Logger} from '../Logger';

export function createNodeMatchWorker(): MatchWorker {
    const localPath = path.join(__dirname, 'full-match-worker.js');
    const compiledPath = path.resolve(__dirname, '../../../out/lib/matching/full-match-worker.js');
    const workerPath = fs.existsSync(localPath) ? localPath : compiledPath;
    return new Worker(workerPath);
}

export function createNodeMatchService(logger?: Logger): FullMatchService {
    return new FullMatchWorkerService(createNodeMatchWorker, {}, logger);
}
