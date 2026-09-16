# Change Log

This changelog records changes made in this independently maintained
distribution. It does not reproduce the update history of the upstream
project.

## Unreleased

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
- Documented the maintained feature set and future Marketplace distribution
  intent.

## License

MIT License. Original copyright and license notice are retained in
`LICENSE.txt`.
