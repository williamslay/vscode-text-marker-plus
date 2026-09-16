import {parentPort} from 'worker_threads';
import {matchText, WorkerRequest, WorkerResponse} from './worker-matcher';

const port = parentPort;
if (!port) {
    throw new Error('Full match worker requires a parent port');
}

port.on('message', (request: WorkerRequest) => {
    let response: WorkerResponse;
    try {
        response = {
            requestId: request.requestId,
            ranges: matchText(request.text, request.pattern)
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        response = {requestId: request.requestId, error: message};
    }
    port.postMessage(response);
});
