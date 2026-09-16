import TextLocationRegistry from '../text-location-registry';
import TextEditor from '../vscode/text-editor';
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
                matches.push(this.addDecoration(visibleEditor, decoration, version, generation));
            });
        });
        return Promise.all(matches).then(() => undefined);
    }

    decorateNearby(editors: TextEditor[], decorations: Decoration[]): void {
        ++this.generation;
        editors.forEach(editor => {
            this.textLocationRegistry.setDocumentVersion(editor.id, editor.version || 0);
            decorations.forEach(decoration => {
                const nearbyTexts = editor.nearbyTexts || [{text: editor.wholeText, offset: 0}];
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

    private addDecoration(editor: TextEditor, decoration: Decoration, version: number, generation: number): Promise<void> {
        const decorationType = this.decorationTypeRegistry.provideFor(decoration);
        if (!decorationType) return Promise.resolve();
        const request = {
            uri: editor.id,
            version,
            text: editor.wholeText,
            pattern: patternFor(decoration.pattern)
        };
        return this.fullMatchService.match(request).then(ranges => {
            if (generation !== this.generation || version !== (editor.version || 0)) return;
            if (this.textLocationRegistry.register(editor.id, decoration.id, version, ranges) === false) return;
            editor.setDecorations(decorationType, ranges);
        }, error => this.logMatchError(error)).then(() => undefined);
    }

    private logMatchError(error: unknown): void {
        if (!this.logger) return;
        this.logger.error(error instanceof Error ? error.message : String(error));
    }
}
