---
name: nesvibes_build-release
description: Build, publish and verify NESVibes through its existing GitHub CI and Production delivery workflow. Use for local release checks and authorized website publication.
---

# NESVibes Build Release

Use `$private-skills_release-workflow` with this adapter. Read root AGENTS.md, docs/production-delivery.md and the current CI, Production delivery and Lighthouse workflows; stop if their contract differs materially from this adapter. Default to local build; publication needs existing user authorization.

## Local gates

Use pinned pnpm and the frozen lockfile: `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm audit --audit-level high`, `pnpm check`, `pnpm test:emu`, `pnpm check:headers`, `pnpm check:rom-assets`, then `pnpm build`. Preserve dependency-age and lifecycle restrictions. CI currently uses Node 22 and Production uses Node 24; retain the checked-in versions.

Local builds skip source-map uploads. Do not retrieve Production secrets or use private dotenv files. Use fake, task-local settings when testing monitoring, and retain the normal SDK capture, tracing, logs and module-load recovery. Production must retain its required source-map upload gate. Verify licensed ROM/legal assets in the build output and preserve security headers and ROM filtering exceptions.

For emulator/UI changes, compare the homepage and first bundled redistributable ROM launch in Brave on desktop and phone widths, then exercise keyboard/pointer release, joystick neutral state and overlay modes. Check fullscreen where the browser permits it; document shared baseline permission failures as coverage gaps rather than claiming a pass or weakening restrictions. Check synchronous file-picker/audio entry and existing input-release lifecycles when those boundaries change.

## Publication

The website is identified by its full Git SHA: no package-version bump, tag or GitHub Release is required. Publish only on the existing synchronized `main` branch with a clean starting base; a scoped reviewed candidate may be dirty during preparation. Preserve unrelated work and stop on divergence or failed gates. Review and commit only the intended files; apply the shared push skill to every authorized push and reconcile the published default-branch README description.

A main push triggers CI and, on exact-main CI success, Production delivery. Follow that existing route; do not deploy directly with Vercel or modify workflows, credentials or source/destination mappings as a recovery shortcut. Monitor exact-SHA CI, secret scan, trusted sync and prebuilt build/stage/verification/promotion. Stop at a failed gate and report it without automatic recovery or credential fallback.

`stage_prebuilt` manually stages the already CI-validated current main. It does not isolate an unpublished candidate: pushing main already triggers automatic Production delivery. Do not claim otherwise.

Require a READY Production deployment for the full fixing SHA and verify that `nesvibes.tsilva.eu` resolves to its deployment ID. Verify the affected production flow. The push-triggered Lighthouse run can precede promotion: reuse a matching post-promotion normal run, otherwise dispatch the existing Lighthouse CI workflow once after verified promotion. Keep the established desktop, three-sample policy and per-sample timing output; report the representative result and range, even when below target. Do not rerun unchanged source for a lucky pass.

Report local checks, push and description reconciliation, exact deployed SHA/alias, browser coverage gaps, and the normal Lighthouse run separately. A successful workflow alone does not establish serving revision or a Performance improvement.
