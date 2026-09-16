import StringPattern from '../pattern/string';
import RegexPattern from '../pattern/regex';
import Pattern from '../pattern/pattern';
import {FlatRange} from '../vscode/flat-range';

export type WorkerPattern = {
    type: string;
    phrase: string;
    ignoreCase: boolean;
    wholeMatch: boolean;
};

export type WorkerRequest = {
    requestId: number;
    pattern: WorkerPattern;
    text: string;
};

export type WorkerResult = {
    requestId: number;
    ranges: FlatRange[];
};

export type WorkerError = {
    requestId: number;
    error: string;
};

export type WorkerResponse = WorkerResult | WorkerError;

export function matchText(text: string, params: WorkerPattern): FlatRange[] {
    const pattern: Pattern = params.type === 'RegExp' ?
        new RegexPattern(params) :
        new StringPattern(params);
    return pattern.locateIn(text);
}
