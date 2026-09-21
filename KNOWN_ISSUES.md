# Known Issues

Checkboxes track resolution status. `Documented since` records the first
release where issue was documented; `Fixed in` records release containing fix.

- [x] Startup restoration could leave active editor without highlights after
  reload. Documented since: `1.0.3`. Fixed in: `1.0.4`.
- [x] Startup restoration can omit non-active panels that are visible after
  reload. Documented since: `1.0.3`. Fixed in: `1.0.5`.
- [ ] In-flight full-document match requests are not cancelled when newer
  refresh supersedes them; stale results are discarded after computation.
  Documented since: `1.0.3`. Fixed in: pending.
- [ ] Refresh cost scales with visible editors and highlight rules, and related
  editor/document events can schedule duplicate work. Documented since:
  `1.0.3`. Fixed in: pending.
- [ ] Shared refresh generation can invalidate unrelated asynchronous highlight
  results when several rules are refreshed together. Documented since:
  `1.0.3`. Fixed in: pending.
- [x] User-supplied regular expressions can require excessive CPU time because
  matching has no timeout or complexity limit. Matching is now bounded by the
  full-match worker timeout, although complex expressions can still consume
  the timeout budget. Documented since: `1.0.3`. Fixed in: `1.0.5`.
- [x] Full-match worker failure recovery and restart handling remain incomplete.
  Documented since: `1.0.3`. Fixed in: `1.0.5`.
- [ ] Plain-text case-insensitive matching can shift highlight ranges after
  U+0130 (`İ`) because lowercasing expands it to two UTF-16 code units. The
  drift grows with each preceding `İ`; case-sensitive and regex matching are
  not affected by this specific issue. Documented since: `1.0.6`. Fixed in:
  pending.
