import SelectedTextFinder from './selected-text-finder';
import {
    Position,
    Range,
    Selection,
    TextEditor as VsTextEditor,
    TextEditorDecorationType,
    TextEditorRevealType
} from 'vscode';
import {FlatRange} from './flat-range';

const FAST_REFRESH_LINE_RADIUS = 100;

export type TextSlice = {
    text: string;
    offset: number;
};

export default class TextEditor {
    private readonly editor: VsTextEditor;
    private readonly selectedTextFinder: SelectedTextFinder;

    constructor(editor: VsTextEditor) {
        this.editor = editor;
        this.selectedTextFinder = new SelectedTextFinder();
    }

    get id() {
        return this.editor.document.uri.toString();
    }

    get version() {
        return this.editor.document.version;
    }

    get selectedText() {
        return this.selectedTextFinder.find(this.editor);
    }

    get wholeText() {
        return this.editor.document.getText();
    }

    get visibleTexts(): TextSlice[] {
        if (!this.editor.visibleRanges) return [{text: this.wholeText, offset: 0}];
        return this.editor.visibleRanges.map(range => {
            const startLine = Math.max(0, range.start.line - 1);
            const endLine = Math.min(this.editor.document.lineCount - 1, range.end.line + 1);
            const expandedRange = new Range(
                new Position(startLine, 0),
                new Position(endLine, this.editor.document.lineAt(endLine).text.length)
            );
            return {
                text: this.editor.document.getText(expandedRange),
                offset: this.editor.document.offsetAt(expandedRange.start)
            };
        });
    }

    get nearbyTexts() {
        if (!this.editor.selection || !this.editor.document.lineCount || !this.editor.document.lineAt) {
            return [{text: this.wholeText, offset: 0}];
        }
        const activeLine = this.editor.selection.active.line;
        const startLine = Math.max(0, activeLine - FAST_REFRESH_LINE_RADIUS);
        const endLine = Math.min(
            this.editor.document.lineCount - 1,
            activeLine + FAST_REFRESH_LINE_RADIUS
        );
        const start = new Position(startLine, 0);
        const end = new Position(endLine, this.editor.document.lineAt(endLine).text.length);
        const range = new Range(start, end);
        return [{
            text: this.editor.document.getText(range),
            offset: this.editor.document.offsetAt(start)
        }];
    }

    get selection(): FlatRange {
        const selection = this.editor.selection;
        return {
            start: this.getFlatPosition(selection.start),
            end: this.getFlatPosition(selection.end)
        };
    }

    private getFlatPosition(position: Position): number {
        return this.editor.document.offsetAt(position);
    }

    set selection(range: FlatRange) {
        this.editor.revealRange(this.getRange(range), TextEditorRevealType.InCenterIfOutsideViewport);
        this.editor.selection = this.getSelection(range);
    }

    private getSelection(range: FlatRange): Selection {
        return new Selection(this.getPosition(range.start), this.getPosition(range.end));
    }

    private getRange(range: FlatRange): Range {
        return new Range(this.getPosition(range.start), this.getPosition(range.end));
    }

    private getPosition(position: number): Position {
        return this.editor.document.positionAt(position);
    }

    setDecorations(decorationType: TextEditorDecorationType, ranges: FlatRange[]) {
        const vsRanges = ranges.map(range => this.getRange(range));
        this.editor.setDecorations(decorationType, vsRanges);
    }

    unsetDecorations(decorationType: TextEditorDecorationType) {
        this.editor.setDecorations(decorationType, []);
    }

}
