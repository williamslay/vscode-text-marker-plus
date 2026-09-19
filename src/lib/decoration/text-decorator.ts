import TextLocationRegistry from '../text-location-registry';
import TextEditor, {TextSlice} from '../vscode/text-editor';
import {FlatRange} from '../vscode/flat-range';
import {Decoration} from '../entities/decoration';
import {DecorationTypeRegistry} from './decoration-type-registry';
import {pipe} from 'fp-ts/lib/pipeable';
import * as O from 'fp-ts/lib/Option';
import {Logger} from '../Logger';
import {FullMatchService, InlineMatchService, patternFor} from '../matching/full-match-service';

export default class TextDecorator {
    private readonly textLocationRegistry: TextLocationRegistry;
    private readonly decorationTypeRegistry: DecorationTypeRegistry;
    private readonly fullMatchService: FullMatchService;
    private readonly logger?: Logger;
    private generation: number;

    constructor(textLocationRegistry: TextLocationRegistry,
                decorationTypeRegistry: DecorationTypeRegistry,
                fullMatchService: FullMatchService = new InlineMatchService(),
                logger?: Logger) {
        this.textLocationRegistry = textLocationRegistry;
        this.decorationTypeRegistry = decorationTypeRegistry;
        this.fullMatchService = fullMatchService;
        this.logger = logger;
        this.generation = 0;
    }

    decorate(editors: TextEditor[], decorations: Decoration[]): Promise<void> {
        const generation = ++this.generation;
        const matches: Array<Promise<void>> = [];
        editors.forEach(visibleEditor => {
            const version = visibleEditor.version || 0;
            this.textLocationRegistry.setDocumentVersion(visibleEditor.id, version);
            decorations.forEach(decoration => {
                const hasViewport = Array.isArray(visibleEditor.visibleTexts);
                const visibleTexts = hasViewport ? visibleEditor.visibleTexts : [{text: visibleEditor.wholeText, offset: 0}];
                const initialTexts = hasViewport ? visibleTexts : [{text: visibleEditor.wholeText, offset: 0}];
                const refresh = this.matchTexts(visibleEditor, decoration, version, initialTexts)
                    .then(viewportRanges => {
                        if (!this.applyDecoration(visibleEditor, decoration, version, generation, viewportRanges)) return;
                        if (!hasViewport || visibleTexts.length === 0) return;
                        const remainingTexts = this.getRemainingTexts(visibleEditor.wholeText, visibleTexts);
                        if (remainingTexts.length === 0) return;
                        return this.matchTexts(visibleEditor, decoration, version, remainingTexts)
                            .then(remainingRanges => {
                                if (generation !== this.generation || version !== (visibleEditor.version || 0)) return;
                                this.applyDecoration(
                                    visibleEditor,
                                    decoration,
                                    version,
                                    generation,
                                    viewportRanges.concat(remainingRanges)
                                );
                            });
                    })
                    .catch(error => this.logMatchError(error));
                matches.push(refresh);
            });
        });
        return Promise.all(matches).then(() => undefined);
    }

    decorateNearby(editors: TextEditor[], decorations: Decoration[]): void {
        ++this.generation;
        editors.forEach(editor => {
            this.textLocationRegistry.setDocumentVersion(editor.id, editor.version || 0);
            decorations.forEach(decoration => {
                const visibleTexts = editor.visibleTexts;
                const nearbyTexts = visibleTexts || editor.nearbyTexts || [{text: editor.wholeText, offset: 0}];
                const ranges = nearbyTexts.reduce<FlatRange[]>(
                    (allRanges, visibleText) => allRanges.concat(
                        decoration.pattern.locateIn(visibleText.text).map(range => ({
                            start: range.start + visibleText.offset,
                            end: range.end + visibleText.offset
                        }))
                    ), []
                );
                const decorationType = this.decorationTypeRegistry.provideFor(decoration);
                editor.setDecorations(decorationType, ranges);
            });
        });
    }

    undecorate(editors: TextEditor[], decorationIds: string[]): void {
        ++this.generation;
        decorationIds.forEach(decorationId => {
            pipe(
                this.decorationTypeRegistry.inquire(decorationId),
                O.map(dt => {
                    editors.forEach(visibleEditor => {
                        visibleEditor.unsetDecorations(dt);
                    });
                })
            );
            this.decorationTypeRegistry.revoke(decorationId);
            this.textLocationRegistry.deregister(decorationId);
        });
    }

    redecorate(editors: TextEditor[], decorations: Decoration[]): void {
        this.undecorate(editors, decorations.map(d => d.id));
        this.decorate(editors, decorations);
    }

    private matchTexts(editor: TextEditor,
                       decoration: Decoration,
                       version: number,
                       texts: TextSlice[]): Promise<FlatRange[]> {
        const pattern = patternFor(decoration.pattern);
        return Promise.all(texts.map(textSlice => this.fullMatchService.match({
            uri: editor.id,
            version,
            text: textSlice.text,
            pattern,
            scopeStart: textSlice.offset,
            scopeEnd: textSlice.offset + textSlice.text.length
        }).then(ranges => ranges.map(range => ({
            start: range.start + textSlice.offset,
                end: range.end + textSlice.offset
            }))))).then(rangeGroups => {
            return rangeGroups.reduce<FlatRange[]>(
                (allRanges, group) => allRanges.concat(group), []
            );
        });
    }

    private applyDecoration(editor: TextEditor,
                             decoration: Decoration,
                             version: number,
                             generation: number,
                             ranges: FlatRange[]): boolean {
        if (generation !== this.generation || version !== (editor.version || 0)) return false;
        const decorationType = this.decorationTypeRegistry.provideFor(decoration);
        if (!decorationType) return false;
        if (this.textLocationRegistry.register(editor.id, decoration.id, version, ranges) === false) return false;
        editor.setDecorations(decorationType, ranges);
        return true;
    }

    private getRemainingTexts(wholeText: string, visibleTexts: TextSlice[]): TextSlice[] {
        const visibleRanges = visibleTexts
            .map(text => ({start: text.offset, end: text.offset + text.text.length}))
            .sort((left, right) => left.start - right.start);
        const remaining: TextSlice[] = [];
        let cursor = 0;
        visibleRanges.forEach(range => {
            const start = Math.max(cursor, Math.min(wholeText.length, range.start));
            const end = Math.max(start, Math.min(wholeText.length, range.end));
            if (start > cursor) {
                remaining.push({
                    text: wholeText.slice(cursor, Math.min(wholeText.length, start + 1)),
                    offset: cursor
                });
            }
            cursor = end < wholeText.length ? Math.max(cursor, end - 1) : wholeText.length;
        });
        if (cursor < wholeText.length) {
            remaining.push({text: wholeText.slice(cursor), offset: cursor});
        }
        return remaining.sort((left, right) => left.text.length - right.text.length);
    }

    private logMatchError(error: unknown): void {
        if (!this.logger) return;
        this.logger.error(error instanceof Error ? error.message : String(error));
    }
}
