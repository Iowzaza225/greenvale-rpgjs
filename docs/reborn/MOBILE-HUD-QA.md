# REBORN Stage 1 — Compact Mobile HUD
**Status: preview implementation, not accepted or production-ready.**

### Decisions
- **Keep native RPGJS mobile joystick + native Action/Interact button** to avoid replacing engine controls with fake HTML inputs.
- Reduce native buttons: the Back and Dash shortcut buttons are disabled in this **mobile preview**; the relevant game logic remains and their desktop behavior is unchanged.
- **Combat:** one large right attack button, smaller target-cycle and auto-attack buttons. Auto-loot still exists in the combat menu, not on the battle screen.
- **Skills:** only 3 of the 10 real hotbar slots appear on screen at once, with a next-page button to cycle through all four pages (3/3/3/1), preserving all slots and cooldowns.
- **Top:** short quest, menu, small target HP; status/loot panels still appear only when needed.
- **Adaptive:** safe-area support, compact landscape mode, touch target >=46 CSS px for primary buttons, reduced-motion-safe.
- Desktop remains on the full old HUD; this PR does **not** implement the desktop PR #15 features.
- No images or code copied from a third-party game. Design consulted permissive / open-source virtual joystick libraries but added **no** extra dependency because withMobile is already present.

### Source files
- src/ui/mobile-hud.ts / .css: runtime class and compact layout
- src/ui/skill-system.ts: mobile hotbar paging, real existing skill dispatch
- src/config/config.client.ts: native joystick + interact control layout
- src/standalone.ts: initialize device-aware HUD at boot
- tests/mobile-hud.spec.ts: Playwright iPhone WebKit control/visibility/event/overlap verification

### Limits / acceptance
This PR focuses **only** on a mobile HUD; characters are still RPGJS placeholder imagery until the art/animation stage. It does not make REBORN a finished game or solve animation runtime triggers. Because this branch is based on `phase/4-combat` rather than `main`, the draft PR against main also contains all previous phase commits. **Do not merge automatically.**

#### Test gate before progressing
- [ ] GitHub Actions build + Phase 0–4 + REBORN mobile HUD test green on PR head
- [ ] Netlify Preview loads actual iPhone Safari (portrait + landscape)
- [ ] Real left thumb walking + right thumb attack + RPGJS native Action interaction
- [ ] Skill paging works, icon cooldown updates, no button hit-area conflicts
- [ ] Mobile labels legible at common small phone sizes
- [ ] No regression to login/save/quest/target/respawn
- [ ] Desktop controls unchanged from Phase 4 until separate tested desktop input import
