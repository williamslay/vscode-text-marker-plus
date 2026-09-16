import DecorationRegistry from './decoration-registry';
import TextDecorator from './text-decorator';
import TextEditor from '../vscode/text-editor';
import Pattern from '../pattern/pattern';
import {Decoration} from '../entities/decoration';
import {pipe} from 'fp-ts/lib/pipeable';
import * as O from 'fp-ts/lib/Option';

export default class DecorationOperator {
    private readonly editors: TextEditor[];
    private readonly decorationRegistry: DecorationRegistry;
    private readonly textDecorator: TextDecorator;
    private fullRefresh: Promise<void>;

    constructor(editors: TextEditor[],
                decorationRegistry: DecorationRegistry,
                textDecorator: TextDecorator) {
        this.editors = editors;
        this.decorationRegistry = decorationRegistry;
        this.textDecorator = textDecorator;
        this.fullRefresh = Promise.resolve();
    }

    addDecoration(pattern: Pattern, colour?: string, refreshNearby = false): boolean {
        return pipe(
            this.decorationRegistry.issue(pattern, colour),
            O.fold(
                () => false,
                decoration => {
                    if (refreshNearby) {
                        this.textDecorator.decorateNearby(this.editors, [decoration]);
                        this.fullRefresh = this.textDecorator.decorate(this.editors, [decoration]);
                    } else {
                        this.fullRefresh = this.textDecorator.decorate(this.editors, [decoration]);
                    }
                    return true;
                }
            )
        );
    }

    removeDecoration(decorationId: string): boolean {
        return pipe(
            this.decorationRegistry.inquireById(decorationId),
            O.fold(
                () => false,
                decoration => {
                    this._removeDecoration(decoration);
                    return true;
                }
            )
        );
    }

    private _removeDecoration(decoration: Decoration) {
        this.decorationRegistry.revoke(decoration.id);
        this.textDecorator.undecorate(this.editors, [decoration.id]);
    }

    updateDecoration(oldDecoration: Decoration, newDecoration: Decoration): void {
        this.decorationRegistry.update(oldDecoration, newDecoration);
        this.textDecorator.redecorate(this.editors, [newDecoration]);
    }

    removeAllDecorations() {
        const decorations = this.decorationRegistry.retrieveAll();
        const decorationIds = decorations.map(d => d.id);
        decorationIds.forEach(decorationId => {
            this.decorationRegistry.revoke(decorationId);
        });
        this.textDecorator.undecorate(this.editors, decorationIds);
    }

    refreshDecorations() {
        const decorations = this.decorationRegistry.retrieveAll();
        this.fullRefresh = this.textDecorator.decorate(this.editors, decorations);
    }

    refreshNearbyDecorations() {
        const decorations = this.decorationRegistry.retrieveAll();
        this.textDecorator.decorateNearby(this.editors, decorations);
    }

    waitForFullRefresh(): Promise<void> {
        return this.fullRefresh;
    }

}
