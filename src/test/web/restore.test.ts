import * as vscode from 'vscode';

// Diagnostic suite for the "saved highlights disappear after reload on a virtual workspace"
// report. It separates two causes: (A) the workspace-scoped settings are visible to the
// extension but the restore pass did not apply them, versus (B) the workspace-scoped
// settings never become visible in the web host at all.

const EXTENSION_ID = 'Williamslay.text-marker-Plus';
const GO_TO_NEXT_HIGHLIGHT_COMMAND = 'textmarker.goToNextHighlight';
const SEEDED_EXPRESSION = 'Zephyr';
const SETTINGS_SEGMENTS = ['.vscode', 'settings.json'];
const FIXTURE_SEGMENTS = ['sample.txt'];
const CONFIG_POLL_INTERVAL_MS = 250;
const CONFIG_POLL_TIMEOUT_MS = 5000;
const RESTORE_POLL_INTERVAL_MS = 200;
const RESTORE_POLL_TIMEOUT_MS = 4000;

interface SavedHighlight {
    pattern?: {expression?: unknown};
    color?: unknown;
}

interface LineCharacter {
    line: number;
    character: number;
}

function fail(message: string): never {
    throw new Error(message);
}

function sleep(milliseconds: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, milliseconds));
}

function describeValue(value: unknown): string {
    try {
        return JSON.stringify(value) ?? String(value);
    } catch (error) {
        return `<unserialisable: ${String(error)}>`;
    }
}

function decode(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

function requireWorkspaceFolder(): vscode.WorkspaceFolder {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return fail(`Expected a workspace folder to be open, got ${describeValue(folders)}`);
    }
    return folders[0];
}

function savedExpressions(savedHighlights: unknown[]): string[] {
    return savedHighlights
        .map(saved => (saved as SavedHighlight | undefined)?.pattern?.expression)
        .filter((expression): expression is string => typeof expression === 'string');
}

async function listDirectory(uri: vscode.Uri): Promise<string> {
    try {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        return entries.map(([name, type]) => `${name}:${type === vscode.FileType.Directory ? 'dir' : 'file'}`).join(', ') || '<empty>';
    } catch (error) {
        return `<unreadable: ${String(error)}>`;
    }
}

function occurrencesOf(content: string, needle: string): LineCharacter[] {
    const occurrences: LineCharacter[] = [];
    let index = content.indexOf(needle);
    while (index >= 0) {
        const linesBefore = content.slice(0, index).split('\n');
        occurrences.push({line: linesBefore.length - 1, character: linesBefore[linesBefore.length - 1].length});
        index = content.indexOf(needle, index + needle.length);
    }
    return occurrences;
}

function savedHighlightsValue() {
    const configuration = vscode.workspace.getConfiguration('textmarker');
    return {
        effective: configuration.get<unknown>('savedHighlights'),
        workspaceFolderValue: configuration.inspect<unknown>('savedHighlights')?.workspaceFolderValue,
        workspaceValue: configuration.inspect<unknown>('savedHighlights')?.workspaceValue,
        defaultSaveTarget: configuration.get<unknown>('defaultSaveTarget')
    };
}

suite('Web host saved-highlight restore', () => {

    test('serves the seeded .vscode/settings.json into the virtual workspace', async () => {
        const folder = requireWorkspaceFolder();
        console.log(`[restore] workspace folder uri: ${folder.uri.toString()} (scheme ${folder.uri.scheme})`);
        console.log(`[restore] workspace name: ${vscode.workspace.name}, workspaceFile: ${vscode.workspace.workspaceFile?.toString()}`);
        console.log(`[restore] workspace root listing: ${await listDirectory(folder.uri)}`);

        const settingsUri = vscode.Uri.joinPath(folder.uri, ...SETTINGS_SEGMENTS);
        console.log(`[restore] settings uri observed: ${settingsUri.toString()}`);

        let bytes: Uint8Array;
        try {
            bytes = await vscode.workspace.fs.readFile(settingsUri);
        } catch (error) {
            return fail(`vscode.workspace.fs.readFile failed for ${settingsUri.toString()}: ${String(error)}`);
        }
        const content = decode(bytes);
        console.log(`[restore] settings content: ${content.replace(/\s+/g, ' ').trim()}`);
        console.log(`[restore] .vscode listing: ${await listDirectory(vscode.Uri.joinPath(folder.uri, SETTINGS_SEGMENTS[0]))}`);

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(content) as Record<string, unknown>;
        } catch (error) {
            return fail(`Seeded ${settingsUri.toString()} is not valid JSON: ${String(error)}`);
        }
        const expressions = savedExpressions(Array.isArray(parsed['textmarker.savedHighlights']) ? parsed['textmarker.savedHighlights'] as unknown[] : []);
        if (!expressions.includes(SEEDED_EXPRESSION)) {
            return fail(`Expected the seeded file to hold '${SEEDED_EXPRESSION}', got ${describeValue(parsed['textmarker.savedHighlights'])}`);
        }
    });

    test('exposes the seeded workspace-scoped savedHighlights to getConfiguration', async () => {
        const first = savedHighlightsValue();
        console.log(`[restore] savedHighlights at test start: effective=${describeValue(first.effective)}`);
        console.log(`[restore] inspect workspaceFolderValue=${describeValue(first.workspaceFolderValue)}, workspaceValue=${describeValue(first.workspaceValue)}`);
        console.log(`[restore] defaultSaveTarget (workspace seed proves the file loaded): ${describeValue(first.defaultSaveTarget)}`);

        if (Array.isArray(first.effective) && first.effective.length > 0) {
            console.log(`[restore] configuration finding: workspace-scoped savedHighlights visible immediately, ${first.effective.length} entry(ies)`);
            return;
        }

        // The value is empty at first. Poll to learn whether the virtual file system serves
        // the workspace settings late, which would point at a restore-timing race.
        const deadline = Date.now() + CONFIG_POLL_TIMEOUT_MS;
        let latest = first;
        for (; ;) {
            latest = savedHighlightsValue();
            if (Array.isArray(latest.effective) && latest.effective.length > 0) break;
            if (Date.now() >= deadline) break;
            await sleep(CONFIG_POLL_INTERVAL_MS);
        }
        console.log(`[restore] savedHighlights after polling ${CONFIG_POLL_TIMEOUT_MS}ms: effective=${describeValue(latest.effective)}`);
        if (Array.isArray(latest.effective) && latest.effective.length > 0) {
            return fail(`Workspace-scoped savedHighlights arrived late: ${describeValue(latest.effective)}`);
        }
        return fail(`Workspace-scoped savedHighlights stayed empty in the web host, effective=${describeValue(latest.effective)}, workspaceValue=${describeValue(latest.workspaceValue)}`);
    });

    test('applies the seeded rule so goToNextHighlight lands on its occurrence', async () => {
        const extension = vscode.extensions.getExtension(EXTENSION_ID);
        if (!extension) {
            return fail(`Extension ${EXTENSION_ID} is not available in the web host`);
        }
        console.log(`[restore] extension already active before probe: ${extension.isActive}`);
        await extension.activate();

        const folder = requireWorkspaceFolder();
        const fileUri = vscode.Uri.joinPath(folder.uri, ...FIXTURE_SEGMENTS);
        const content = decode(await vscode.workspace.fs.readFile(fileUri));
        const occurrences = occurrencesOf(content, SEEDED_EXPRESSION);
        console.log(`[restore] fixture ${fileUri.toString()} occurrences of '${SEEDED_EXPRESSION}': ${describeValue(occurrences)}`);
        if (occurrences.length < 2) {
            return fail(`Expected at least two occurrences of '${SEEDED_EXPRESSION}' in ${fileUri.toString()}, got ${occurrences.length}`);
        }

        const document = await vscode.workspace.openTextDocument(fileUri);
        const editor = await vscode.window.showTextDocument(document);
        const first = occurrences[0];
        const expected = occurrences[1];
        const deadline = Date.now() + RESTORE_POLL_TIMEOUT_MS;
        let caret = {line: -1, character: -1};
        for (; ;) {
            editor.selection = new vscode.Selection(first.line, first.character, first.line, first.character);
            await vscode.commands.executeCommand(GO_TO_NEXT_HIGHLIGHT_COMMAND);
            await sleep(RESTORE_POLL_INTERVAL_MS);
            caret = {line: editor.selection.start.line, character: editor.selection.start.character};
            if (caret.line === expected.line && caret.character === expected.character) break;
            if (Date.now() >= deadline) break;
        }
        console.log(`[restore] caret after goToNextHighlight: (${caret.line},${caret.character}), expected (${expected.line},${expected.character})`);
        if (caret.line !== expected.line || caret.character !== expected.character) {
            const effective = vscode.workspace.getConfiguration('textmarker').get<unknown>('savedHighlights');
            return fail(`Restore did not register the workspace-scoped rule: caret stayed at (${caret.line},${caret.character}) instead of (${expected.line},${expected.character}). Effective savedHighlights=${describeValue(effective)}. An unmoved caret means the decoration registry held no range covering offset ${first.line}:${first.character}.`);
        }
    });

});
