import {FlatRange} from './vscode/flat-range';
import * as O from 'fp-ts/lib/Option';
import {OptionMap} from './common/collection';
import {findFirst} from 'fp-ts/lib/Array';
import {pipe} from 'fp-ts/lib/pipeable';

export default class TextLocationRegistry {
    private readonly recordMap: OptionMap<OptionMap<FlatRange[]>>;
    private readonly documentVersions: OptionMap<number>;

    constructor() {
        this.recordMap = new OptionMap();
        this.documentVersions = new OptionMap();
    }

    setDocumentVersion(editorId: string, documentVersion: number): void {
        const currentVersion = this.documentVersions.get(editorId);
        if (O.isSome(currentVersion) && currentVersion.value === documentVersion) return;
        this.documentVersions.set(editorId, documentVersion);
        this.recordMap.set(editorId, new OptionMap());
    }

    register(editorId: string, decorationId: string, ranges: FlatRange[]): boolean;
    register(editorId: string, decorationId: string, documentVersion: number, ranges: FlatRange[]): boolean;
    register(editorId: string, decorationId: string, versionOrRanges: number | FlatRange[], ranges?: FlatRange[]): boolean {
        const documentVersion = typeof versionOrRanges === 'number' ? versionOrRanges : 0;
        const finalRanges = typeof versionOrRanges === 'number' ? ranges : versionOrRanges;
        if (!finalRanges) return false;
        const currentVersion = this.documentVersions.get(editorId);
        if (O.isSome(currentVersion) && currentVersion.value !== documentVersion) return false;
        if (O.isNone(currentVersion)) this.setDocumentVersion(editorId, documentVersion);
        const editorDecorations = pipe(
            this.recordMap.get(editorId),
            O.getOrElse(() => new OptionMap())
        );
        editorDecorations.set(decorationId, finalRanges.slice());
        this.recordMap.set(editorId, editorDecorations);
        return true;
    }

    deregister(decorationId: string) {
        [...this.recordMap.values()].forEach(decorationIdMap => {
            decorationIdMap.delete(decorationId);
        });
    }

    queryDecorationId(editorId: string, range: FlatRange, documentVersion?: number): O.Option<string> {
        if (!this.isCurrentVersion(editorId, documentVersion)) return O.none;
        return pipe(
            this.findDecorationIdAndRanges(editorId, range),
            O.map(([decorationId]) => decorationId)
        );
    }

    findNextOccurence(editorId: string, range: FlatRange, documentVersion?: number): O.Option<FlatRange> {
        if (!this.isCurrentVersion(editorId, documentVersion)) return O.none;
        return pipe(
            this.findDecorationIdAndRanges(editorId, range),
            O.map(([_, ranges]) => {
                const newIndex = ranges.findIndex(this.isPointingRange(range)) + 1;
                return ranges[newIndex === ranges.length ? 0 : newIndex];
            })
        );
    }

    findPreviousOccurence(editorId: string, range: FlatRange, documentVersion?: number): O.Option<FlatRange> {
        if (!this.isCurrentVersion(editorId, documentVersion)) return O.none;
        return pipe(
            this.findDecorationIdAndRanges(editorId, range),
            O.map(([_, ranges]) => {
                const newIndex = ranges.findIndex(this.isPointingRange(range)) - 1;
                return ranges[newIndex < 0 ? ranges.length - 1 : newIndex];
            })
        );
    }

    private findDecorationIdAndRanges(editorId: string, range: FlatRange): O.Option<[string, FlatRange[]]> {
        return pipe(
            this.recordMap.get(editorId),
            O.chain(decorationMap => findFirst(([_decorationId, ranges]) => ranges.some(this.isPointingRange(range)))([...decorationMap.entries()]))
        );
    }

    private isCurrentVersion(editorId: string, documentVersion?: number): boolean {
        if (documentVersion === undefined) return true;
        return pipe(
            this.documentVersions.get(editorId),
            O.fold(() => false, currentVersion => currentVersion === documentVersion)
        );
    }

    private isPointingRange(range2: FlatRange): (range: FlatRange) => boolean {
        return (range1: FlatRange) => {
            if (range2.start < range1.start || range2.end > range1.end) return false;
            return range2.start === range2.end ||
                (range1.start === range2.start && range1.end === range2.end);
        };
    }

}
