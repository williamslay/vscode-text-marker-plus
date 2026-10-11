# Change Log

This changelog records changes made in this independently maintained
distribution. It does not reproduce the update history of the upstream
project.

Known issues are tracked separately in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## 1.0.9 - 2026-10-11

Stable release of the Web platform support first published as pre-release
1.0.8. The stable channel now resolves a manifest that carries the `browser`
entry point, so the extension installs from the Marketplace in VS Code for the
Web. VS Code for the Web evaluates the release version's manifest when
installing, which is why pre-release 1.0.8 could not be installed there.

## 1.0.8 - 2026-10-11 (pre-release)

### Added

- Support for the VS Code Web platform through a bundled `browser` entry point,
  with virtual and untrusted workspace support.
- Full-document matching in the extension host on Web, since Web hosts have no
  worker threads. It has no result cache yet.
- `yarn run build-web` to bundle the Web entry point with esbuild, run by
  `vscode:prepublish`.
- `yarn run web-test` to run `src/test/web/` in headless browser VS Code through
  `@vscode/test-web`, and `yarn run web-test-serve` for manual checks.
- Pre-release publishing: a `v*-pre` tag publishes the build to the Marketplace
  as a pre-release version, and `tag-release.sh --pre` creates that tag.
- Resolution of the `workspace` save target to Global settings on the Web host
  when the open folder is a virtual file system, so highlights survive a reload.

### Changed

- `textmarker.autoSaveOnToggle` now defaults to `true` again, so toggling a
  highlight persists rules immediately as it did before 1.0.1.
- Raised the minimum supported VS Code version from 1.51.0 to 1.74.0, and pinned
  `@types/vscode` to the same floor.
- **Clear All Highlights** now persists the cleared rules in the settings scope
  that owns them, since VS Code replaces array settings across scopes.
- **Save All Highlights** now reports a failed settings write instead of failing
  silently.
- Moved worker creation into `src/lib/matching/node-match-worker.ts` to keep
  Node builtins out of the Web bundle.
- CI skips the Playwright browser download, which only `web-test` needs.
- `tag-release.sh` now requires the `master` branch and a clean working tree,
  and pushes `master` before tagging.
- Excluded the bundled Web test entry from the VSIX, and `.vscode-test-web/`
  from Git and ESLint.
- Documented which settings file each save target writes, including the
  Remote-SSH and WSL case, the scope precedence order, and per-repository rules
  on a virtual workspace.

### Removed

- `textmarker.defaultSaveTarget` option `prompt` and its quick pick. An
  unrecognised value is treated as `workspace`, and the `workspace` target
  writes Global settings when no folder is open.

## 1.0.7 - 2026-09-26

### Changed

- Restored saved highlights through the registry before one startup render to
  avoid duplicate decoration work.
- Reduced VSIX payload by excluding non-runtime `fp-ts` artifacts.

### Fixed

- Refreshed the active editor when VS Code has not populated its visible-editor
  list during startup.
- Corrected literal-match offsets for U+0130.

## 1.0.6 - 2026-09-21

### Changed

- Use one staged refresh for active-document changes: visible ranges are
  refreshed first, followed by remaining document ranges in the background.
- Removed nearby refreshes, the 300ms refresh delay, and
  `textmarker.delayForRefreshingHighlight`.

## 1.0.5 - 2026-09-19

### Changed

- Prioritized matching and highlighting for visible editor ranges before
  completing the remaining document asynchronously in the background.
- Added overlapping boundaries to background matching ranges so matches at
  visible-range edges are not missed.
- Scoped full-match cache entries by document range to prevent viewport results
  from being reused as full-document results.

### Fixed

- Refreshed all currently visible editor panes, including non-active split
  panels, during full decoration refreshes.
- Prevented stale viewport and background results from replacing newer refresh
  results.
- Added full-match worker timeout handling and worker replacement after timeout,
  errors, or unexpected exit.
- Added bounded handling for expensive regular-expression matching so a stuck
  worker cannot block matching indefinitely.

## 1.0.4 - 2026-09-18

### Fixed

- Refresh the active editor after startup restoration when VS Code has not yet
  populated its visible-editor list during reload.
- Refreshed all saved highlights after startup restoration so current editors
  display highlights immediately after reload.

## 1.0.3 - 2026-09-17

### Changed

- Limited automatic full matching to the active document and its visible split
  panes; background documents are matched when they become active.
- Replaced versioned cache entries with one version-checked entry per document
  and highlight rule, while retaining bounded LRU eviction.
- Replaced allocation-heavy literal range construction with linear scanning.

## 1.0.2 - 2026-09-17

### Changed

- Updated the development and CI toolchain to Node.js 22.
- Replaced TSLint with ESLint and TypeScript ESLint.
- Updated TypeScript and Node.js type definitions.

## 1.0.1 - 2026-09-17

### Changed

- Updated runtime dependency versions for current Node.js and VS Code tooling.
- Added Azure Pipelines CI with frozen Yarn installation, validation, and VSIX
  packaging.
- Added tag-triggered Marketplace publishing through Azure Workload Identity
  Federation.
- Updated CodeQL workflow actions and test setup for the maintained distribution.

## 1.0.0 - 2026-09-16

### Added

- Established an independently maintained distribution derived from
  [ryu1kn/vscode-text-marker](https://github.com/ryu1kn/vscode-text-marker).
- Preserved highlight-rule navigation, including next/previous navigation for
  occurrences belonging to the same rule.
- Added `textmarker.defaultSaveTarget` with `workspace`, `global`, and `prompt`
  modes. The default is `workspace`, with safe prompt fallback when no
  Workspace is open.
- Added `textmarker.autoSaveOnToggle` for optional automatic persistence after
  adding or removing a highlight.
- Changed the default highlight palette to the six One Half Dark accent colors.
- Added optional `textmarker.userColor` array and `textmarker.useUserColor`
  switch for extending the color set used by subsequent color cycles.
- Documented the maintained feature set and independent distribution status.

### Changed

- Full-document matching runs in a dedicated worker and caches completed
  matches by document version and highlight rule.
- Visible split panes refresh highlights even when they do not have focus.
- Changed the default extension display name to `Text Marker Plus`.

### Fixed

- Discarded stale asynchronous match results after document, rule, or pane
  changes.
- Preserved complete navigation ranges while nearby matches render quickly.

### Removed

- Removed telemetry reporting, the `telemetryKey`, and the
  `textmarker.enableTelemetry` setting.

## License

MIT License. Original copyright and license notice are retained in
`LICENSE.txt`.
