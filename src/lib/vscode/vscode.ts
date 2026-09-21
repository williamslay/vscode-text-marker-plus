import TextEditor from './text-editor';

export type DocumentChangeLike = {
    readonly document: {
        readonly uri: {
            readonly toString: () => string
        }
    }
};

export type ExtensionContextLike = {
    subscriptions: any[]
};

export interface CommandLike {
    execute(editor?: TextEditor): Promise<any> | any;
    executeDocumentChange?(change: DocumentChangeLike): void;
    refreshVisibleEditors?(): void;
}
