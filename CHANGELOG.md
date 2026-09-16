# Change Log

This changelog records changes made in this independently maintained
distribution. It does not reproduce the update history of the upstream
project.

## Unreleased

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
