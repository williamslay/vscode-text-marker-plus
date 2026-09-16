import {CommandLike} from '../vscode/vscode';
import TextLocationRegistry from '../text-location-registry';
import TextEditor from '../vscode/text-editor';
import DecorationRegistry from '../decoration/decoration-registry';
import WindowComponent from '../vscode/window';
import DecorationOperatorFactory from '../decoration/decoration-operator-factory';
import PatternFactory from '../pattern/pattern-factory';
import MatchingModeRegistry from '../matching-mode-registry';
import {FlatRange} from '../vscode/flat-range';
import * as O from 'fp-ts/lib/Option';
import {DecorationTypeRegistry} from '../decoration/decoration-type-registry';
import {pipe} from 'fp-ts/lib/pipeable';

export abstract class GoToHighlightCommand implements CommandLike {
    protected readonly textLocationRegistry: TextLocationRegistry;
    private readonly decorationOperatorFactory: DecorationOperatorFactory;
    private readonly patternFactory: PatternFactory;

    protected abstract findTargetLocation(editor: TextEditor): O.Option<FlatRange>;

    constructor(matchingModeRegistry: MatchingModeRegistry,
                textLocationRegistry: TextLocationRegistry,
                decorationRegistry: DecorationRegistry,
                decorationTypeRegistry: DecorationTypeRegistry,
                windowComponent: WindowComponent,
                decorationOperatorFactory?: DecorationOperatorFactory) {
        this.decorationOperatorFactory = decorationOperatorFactory ||
            new DecorationOperatorFactory(decorationRegistry, decorationTypeRegistry, textLocationRegistry, windowComponent);
        this.textLocationRegistry = textLocationRegistry;
        this.patternFactory = new PatternFactory(matchingModeRegistry);
    }

    async execute(editor: TextEditor) {
        const decorationId = this.textLocationRegistry.queryDecorationId(editor.id, editor.selection, editor.version);
        if (O.isNone(decorationId)) await this.addDecoration(editor);
        pipe(
            O.some(undefined),
            O.chain(() => this.findTargetLocation(editor)),
            O.map(range => { editor.selection = range; })
        );
    }

    private async addDecoration(textEditor: TextEditor): Promise<void> {
        if (!textEditor.selectedText) return;
        const pattern = this.patternFactory.create({phrase: textEditor.selectedText});
        const decorationOperator = this.decorationOperatorFactory.createForVisibleEditors();
        if (decorationOperator.addDecoration(pattern)) await decorationOperator.waitForFullRefresh();
    }
}
