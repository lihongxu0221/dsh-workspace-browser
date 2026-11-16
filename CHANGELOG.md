# Changelog

## 0.7.1

- Rename the package to `@lihongxu0221/dsh-ui-codex` so it can be published
  and installed from npm under a shorter name (the GitHub repo keeps its
  name). All `cordis.patch.yml` row `name:` references and the client build
  script follow the new name.
- Upgrade the DSH client generation pinned in `devDependencies` from
  `0.2.2-rc.2` to `0.2.2-rc.3` (`@deepseek-ai/cordis` stays `^4.1.0`) and
  regenerate `pnpm-lock.yaml`.
- Rebuild `lib/client.js`, `lib/index.js` and the seven node entries against
  rc.3. No source behaviour change; `contract-check` passes (35 peers, 135
  named imports, 15 client-inject ids, 0 missing) and the suite is 86/86.

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