# NESVibes

Preserve browser-only emulator behavior, redistributable ROM catalogs and security headers. Run pnpm check, test:emu, check:headers and check:rom-assets for relevant changes.

Local builds skip Sentry source-map uploads. GitHub Actions production builds handle uploads. Production uses isolated nesvibes-production Production /. Never print credentials or upload private dotenv files. Retain originals until verified rotation.
