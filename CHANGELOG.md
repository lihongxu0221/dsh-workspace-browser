# Changelog

## 0.7.0

- Integrate the former `@michengai/dsh-codex-ui` capabilities into this
  plugin: composer prediction and input history, full-screen settings skin,
  theme/glass system, session-title provider, desktop titlebar menu,
  dependency management and About section, mobile-web layout, eight
  languages, workspace sections, and an optional panel navigation.
- Keep the existing workspace browser as the only owner of
  `sidebar.workspaces` and `ctx.uiWorkspace`; do not vendor the reference
  plugin's DOM takeover layer.
- Add six independent node sub-plugin entries and matching
  `cordis.patch.yml` rows.
- Add workspace sections, an optional panel nav, and matching text, toast,
  and keyboard interactions.
- Add `LICENSE-APACHE` and `THIRD_PARTY_NOTICES.md` for the Apache-2.0
  portions adapted from the reference project.
- Add `INTEGRATION.md`, a Chinese integration plan and feature comparison.