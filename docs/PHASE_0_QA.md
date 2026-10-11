# Phase 0 QA — Foundation and Boot Stability

## Automated gate

GitHub Actions must pass:

1. `pnpm install --no-frozen-lockfile`
2. `RPG_TYPE=rpg pnpm run build`
3. Install Playwright WebKit
4. `pnpm run test:phase0`

The WebKit smoke test emulates an iPhone, opens the title screen, starts a guest character, waits for the RPGJS canvas, and fails if the runtime error overlay appears or an `applySyncPacket` / module-script boot error is observed.

## Manual iPhone Safari test

1. Open the Netlify deploy preview with `?debug=1`.
2. Confirm a build label appears in the upper corner.
3. Tap New Game, enter a temporary name, then Start.
4. Confirm the map, joystick, player and monster render.
5. Move and attack for at least 30 seconds.
6. Confirm no GREENVALE RUNTIME ERROR overlay appears.
7. If an error appears, tap **คัดลอก Error · COPY** and paste the report into the issue/chat.
8. Reload once and confirm the HTML shell does not serve an older build id.

## Cache / deploy sanity

- `/` and `/index.html` are sent with `Cache-Control: no-store`.
- `/assets/*` are content-hashed and immutable.
- There is no catch-all SPA rewrite in Phase 0; missing JS remains a real 404 instead of returning HTML.
- Netlify publishes `dist` and builds with `pnpm run build` on Node 22.
