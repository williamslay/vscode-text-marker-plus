# Change Log

This changelog records changes made in this independently maintained
distribution. It does not reproduce the update history of the upstream
project.

Known issues are tracked separately in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Unreleased

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
