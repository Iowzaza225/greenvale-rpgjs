# Phase 1 QA — Title, Character Creation, Save, Prologue, Tutorial

## Automated iPhone WebKit checks

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
```

Phase 1 automation verifies:

- title opens on iPhone-sized WebKit
- TH/EN switch re-renders without reload
- Guest opens exactly 3 character slots
- name length validation rejects invalid names
- creator preview direction and animation controls respond
- all 6 future professions render
- character can be created as Novice
- prologue can be skipped
- RPGJS canvas still boots
- mandatory walk / attack / training-medicine / quest tutorial completes
- save is version 2 and persists the character/tutorial state
- runtime overlay stays hidden
- no `applySyncPacket`, module-script, or RPGJS boot fatal error occurs

## Manual iPhone Safari

1. Open the Phase 1 Netlify Deploy Preview with `?debug=1`.
2. Confirm the title fits within the safe area.
3. Toggle TH/EN and sound.
4. Tap Play now / เล่นเลย.
5. Confirm 3 slots appear.
6. Create one character:
   - test a 2-character name and confirm it is rejected
   - use Random name
   - try all 6 hair styles
   - try several hair/skin colors and outfits
   - rotate through 4 directions
   - cycle idle / walk / attack previews
   - open the 6-profession preview
7. Create the character and watch or skip the 6-frame prologue.
8. In the world, complete all 4 tutorial steps.
9. Reload the page, enter Guest again, and confirm the character is still in its slot.
10. Rename once, then confirm the free rename count becomes 0.
11. Create a second character and verify duplicate names are rejected.
12. Test delete by entering the wrong confirmation name, then the exact name.
13. Confirm the error overlay never appears.

## Known Phase 1 limitations

- Login is a backend-ready UI stub; authentication is not connected yet.
- Character appearance is saved and shown in the creator/slot UI, but the RPGJS in-world sprite is still the temporary Phase 0 placeholder.
- The tutorial medicine is a tutorial-layer action; full item inventory/hotbar integration belongs to later gameplay phases.
- Name uniqueness is local to the three Guest slots until a backend account/name service exists.
