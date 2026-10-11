import * as vscode from 'vscode';

const EXTENSION_ID = 'Williamslay.text-marker-Plus';
const TOGGLE_HIGHLIGHT_COMMAND = 'textmarker.toggleHighlight';
const SAVE_ALL_HIGHLIGHTS_COMMAND = 'textmarker.saveAllHighlights';
const GO_TO_NEXT_HIGHLIGHT_COMMAND = 'textmarker.goToNextHighlight';
const DOCUMENT_CONTENT = 'alpha beta alpha';
const HIGHLIGHTED_TEXT = 'alpha';
const SECOND_OCCURRENCE_LINE = 0;
const SECOND_OCCURRENCE_CHARACTER = 11;

interface SavedHighlight {
    pattern?: {expression?: unknown};
}

function sleep(milliseconds: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, milliseconds));
}

function savedExpressions(savedHighlights: unknown[]): string[] {
    return savedHighlights
        .map(saved => (saved as SavedHighlight | undefined)?.pattern?.expression)
        .filter((expression): expression is string => typeof expression === 'string');
}

// The workspace settings file (fixtures/.vscode/settings.json) is served into the web
// workspace, so its textmarker.savedHighlights value overrides whatever the command writes
// to the Global target. Read both the effective value and the Global value the command
// actually wrote, otherwise the workspace-scoped fixture shadows the assertion.
function savedHighlightCandidates(): unknown[] {
    const configuration = vscode.workspace.getConfiguration('textmarker');
    return [
        ...(configuration.get<unknown[]>('savedHighlights') || []),
        ...(configuration.inspect<unknown[]>('savedHighlights')?.globalValue || [])
    ];
}

async function waitForSavedHighlight(expression: string): Promise<unknown[]> {
    const deadline = Date.now() + 3000;
    let savedHighlights: unknown[] = [];
    for (; ;) {
        savedHighlights = savedHighlightCandidates();
        if (savedExpressions(savedHighlights).includes(expression) || Date.now() >= deadline) {
            return savedHighlights;
        }
        await sleep(100);
    }
}

suite('Web host smoke', () => {

    let editor: vscode.TextEditor;

    test('runs on the web host', () => {
        if (vscode.env.uiKind !== vscode.UIKind.Web) {
            throw new Error(`Expected vscode.env.uiKind to be Web, got ${String(vscode.env.uiKind)}`);
        }
    });

    test('activates the extension', async () => {
        const extension = vscode.extensions.getExtension(EXTENSION_ID);
        if (!extension) {
            throw new Error(`Extension ${EXTENSION_ID} is not available in the web host`);
        }
        await extension.activate();
        if (!extension.isActive) {
            throw new Error(`Extension ${EXTENSION_ID} did not become active`);
        }
    });

    test('registers the contributed commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        [TOGGLE_HIGHLIGHT_COMMAND, GO_TO_NEXT_HIGHLIGHT_COMMAND, SAVE_ALL_HIGHLIGHTS_COMMAND].forEach(command => {
            if (!commands.includes(command)) {
                throw new Error(`Command ${command} is not registered in the web host`);
            }
        });
    });

    test('matches every occurrence through the inline match service', async () => {
        const document = await vscode.workspace.openTextDocument({language: 'plaintext', content: DOCUMENT_CONTENT});
        editor = await vscode.window.showTextDocument(document);
        editor.selection = new vscode.Selection(0, 0, 0, HIGHLIGHTED_TEXT.length);

        await vscode.commands.executeCommand(TOGGLE_HIGHLIGHT_COMMAND);
        await vscode.commands.executeCommand(GO_TO_NEXT_HIGHLIGHT_COMMAND);

        const start = editor.selection.start;
        if (start.line !== SECOND_OCCURRENCE_LINE || start.character !== SECOND_OCCURRENCE_CHARACTER) {
            throw new Error(`Expected the inline match service to register the second '${HIGHLIGHTED_TEXT}' at (${SECOND_OCCURRENCE_LINE},${SECOND_OCCURRENCE_CHARACTER}), the cursor went to (${start.line},${start.character})`);
        }
    });

    test('saves the toggled highlight', async () => {
        await vscode.workspace.getConfiguration('textmarker').update('defaultSaveTarget', 'global', vscode.ConfigurationTarget.Global);

        await vscode.commands.executeCommand(SAVE_ALL_HIGHLIGHTS_COMMAND);
        const savedHighlights = await waitForSavedHighlight(HIGHLIGHTED_TEXT);

        if (!savedExpressions(savedHighlights).includes(HIGHLIGHTED_TEXT)) {
            throw new Error(`Expected textmarker.savedHighlights to hold the pattern '${HIGHLIGHTED_TEXT}', got ${JSON.stringify(savedHighlights)}`);
        }
    });

    test('persists settings globally', async () => {
        await vscode.workspace.getConfiguration('textmarker').update('savedHighlights', [], vscode.ConfigurationTarget.Global);
        const savedHighlights = vscode.workspace.getConfiguration('textmarker').get<unknown>('savedHighlights');
        if (!Array.isArray(savedHighlights)) {
            throw new Error(`Expected textmarker.savedHighlights to be an array, got ${typeof savedHighlights}`);
        }
    });

});
