import Pattern, {PatternParams} from './pattern';
import {FlatRange} from '../vscode/flat-range';

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
        let start = comparedText.indexOf(phrase, searchOffset);
        while (start !== -1) {
            ranges.push({start, end: start + this.phrase.length});
            searchOffset = start + phrase.length;
            start = comparedText.indexOf(phrase, searchOffset);
        }
        return ranges;
    }

    private getPhraseForComparison() {
        return this.ignoreCase ? this.phrase.toLowerCase() : this.phrase;
    }

    private getTextForComparison(text: string) {
        return this.ignoreCase ? text.toLowerCase() : text;
    }

    protected create(params: PatternParams) {
        return new StringPattern(params);
    }

}
