import Pattern, {PatternParams} from './pattern';
import {FlatRange} from '../vscode/flat-range';

type ComparedText = {
    readonly text: string;
    readonly sourceStarts: readonly number[];
    readonly sourceEnds: readonly number[];
};

export default class StringPattern extends Pattern {

    public type = 'String';

    get displayText() {
        return this.phrase;
    }

    protected findCandidateRanges(text: string): FlatRange[] {
        const phrase = this.getPhraseForComparison();
        if (!phrase) return [];

        const comparedText = this.getTextForComparison(text);
        const ranges: FlatRange[] = [];
        let searchOffset = 0;
        let start = comparedText.text.indexOf(phrase, searchOffset);
        while (start !== -1) {
            ranges.push(this.getSourceRange(comparedText, start, phrase.length));
            searchOffset = start + phrase.length;
            start = comparedText.text.indexOf(phrase, searchOffset);
        }
        return ranges;
    }

    private getPhraseForComparison() {
        return this.ignoreCase ? this.phrase.toLowerCase() : this.phrase;
    }

    private getTextForComparison(text: string): ComparedText {
        if (!this.ignoreCase) {
            return {text, sourceStarts: [], sourceEnds: []};
        }

        const sourceStarts: number[] = [];
        const sourceEnds: number[] = [];
        let sourceOffset = 0;
        for (const character of text) {
            const comparedCharacter = character.toLowerCase();
            for (let offset = 0; offset < comparedCharacter.length; offset += 1) {
                sourceStarts.push(sourceOffset);
                sourceEnds.push(sourceOffset + character.length);
            }
            sourceOffset += character.length;
        }
        return {text: text.toLowerCase(), sourceStarts, sourceEnds};
    }

    private getSourceRange(comparedText: ComparedText, start: number, length: number): FlatRange {
        if (!this.ignoreCase) return {start, end: start + length};
        return {
            start: comparedText.sourceStarts[start],
            end: comparedText.sourceEnds[start + length - 1]
        };
    }

    protected create(params: PatternParams) {
        return new StringPattern(params);
    }

}
