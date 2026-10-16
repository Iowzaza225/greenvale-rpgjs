# GREENVALE AFTERFALL — REBORN
## Architecture & integration plan v0.1

**สถานะ: ข้อเสนอเชิงสถาปัตยกรรม (ยังไม่มี gameplay implementation ในสาขานี้)**

### 1. หลักการ
- **เก็บ RPGJS v5 + CanvasEngine/Pixi + Vite/TypeScript** ที่มีในโปรเจกต์ไว้ก่อน เพราะฐานมี movement/combat rendering และ build path อยู่แล้ว; เปลี่ยน engine เฉพาะเมื่อพิสูจน์ได้ว่าข้อจำกัดเชิงเทคนิคแก้ไม่ได้
- แยก domain gameplay ออกจาก visual assets / UI / input เพื่อหลีกเลี่ยงการเพิ่มฟีเจอร์แล้วทุกระบบพังพร้อมกัน
- ไม่ merge PR #15/#16/#17 รวดเดียว: PR #17 แยกจาก phase/4-combat (mobile-only) ในขณะที่ PR #15–16 คือ desktop+2.5D สายอื่น
- สร้าง vertical slice ใหม่โดย reuse **เฉพาะส่วนที่ผ่าน regression แล้ว** แบบคัดทีละชุด และพร้อม rollback
- ให้ server/game simulation เป็นเจ้าของ HP, hit detection, cooldown, actor state; client UI/renderer สังเกตและแสดงเท่านั้น

### 2. Baseline ที่ตรวจพบ (16 ต.ค. 2026)
- main ปัจจุบัน package version 0.2.2, มี minimal RPGJS runtime, ยังไม่ใช่ phase/4 หรือ desktop branch
- phase/5-mobile-25d-animation = 0.8.0-mobile-art, มี bootstrap, save v5 migration, event bus, data-driven JSON และ Canvas-generated 27x4 sprite atlas (9 animation banks x 3 poses x 4 directions)
- PR #17 เรียก attack2/attack3 -> attack bank แต่ full hit/death/rest/emote triggering และการแต่งตัว layered ยังไม่ครบ
- PR #15 desktop+map และ PR #16 smooth sprite อีกแนวใช้ฐานต่างกัน; ต้องเทียบ diff/test ก่อนคัดมา
- phase/5 mobile art maps.json ยังมีเพียง Greenvale Camp; ห้ามสมมติว่าเป็น world 5 zones
- PR ทั้งหมดที่กล่าวถึงเป็น preview/draft; ไม่มีเหตุให้ถือว่า production-ready

### 3. Proposed boundary diagram
[Browser Input: touch/keyboard/mouse]
                 |
                 v
[Input Adapter] -> [Action Dispatcher] -> [RPGJS gameplay state]
                                           | character/AI/HP/collision/range
                                           | authoritative animation/combat event
                                           v
                                    [Event Bridge]
                                         /   \
                                        v     v
                              [Sprite Renderer] [HUD / Audio / VFX]
                                        ^
                                        |
                               [2.5D World Renderer]
                               ground/props/depth/collision

[Versioned Guest Save] <-> [Gameplay State]
[JSON Data + i18n] -----> [Gameplay configuration]

### 4. Suggested modules (names are proposed, not files that already exist)
- reborn/bootstrap: init order, lazy resource loading, visible error handling, version stamp, test hooks
- reborn/input: unified actions (move, target, attack, skill, menu) with keyboard/touch adapters, blur/focus reset
- reborn/gameplay: actor FSM, combat hit-window logic, enemy AI, death/respawn and protected spawn point
- reborn/render: sprite atlas loader, animation player, 4-direction facing, interpolation, camera, depth sorting, effects
- reborn/ui: HP/target/hotbar responsive views and modal lifecycle
- reborn/persistence: versioned guest save under reborn-specific key and legacy read-only migration adapter
- reborn/qa: deterministic scenario hooks and Playwright browser smoke tests

These are boundaries, not a command to duplicate RPGJS features. Build thin adapters over RPGJS first.

### 5. Actor animation contract
A common typed event interface is required between gameplay and sprite renderer:

- actor:spawned {id, speciesOrClass, position, facing}
- actor:movement {id, moving, position, facing}
- actor:action {id, actionId, phase, animationId, startedAt}
- combat:hit-resolved {attackerId, targetId, result, hpAfter, actionId}
- actor:damaged {id, damage, hpAfter}
- actor:defeated {id, deathId}
- actor:respawned {id, position, hp}
- world:changed {mapId}

**State priority** (proposed): dead > hit (interruptible rules) > attack > move > idle. Native RPGJS action events are adapted to this vocabulary; game simulation owns timing and collision. No separate HTML element pretending to be the actual player sprite.

Renderer requirements:
- Each animation is a distinct sequence with metadata: frames, duration, pivot/foot anchor, facing, attack contact frame.
- Keep visual foot anchor at collision origin even when sprite is taller than hitbox.
- On attack, advance frame index over time and show impact animation only when combat hit event confirms success.
- On death, cancel movement/attacks, complete dead state once; on respawn, reset renderer and control state.
- Reuse atlases/textures and dispose on map change; never redraw all atlases on every tick.
- A debug overlay may show live actor state + frame index, but must be disabled by default.

### 6. World contract
- Separate visual prop height, collision footprint and sorting baseY; assign depth by foot Y, not sprite center.
- Obstacle geometry shared with simulation so player cannot appear to pass through a visible wall.
- Safe spawn must not place aggressive enemies in detection radius.
- For first slice keep one small bounded map, limited props, no cross-map warps required.
- Never market decorative 2.5D graphics as actual 3D models.

### 7. Saving / existing users
- Existing save namespaces and schemas remain untouched (legacy read-only in planning).
- New REBORN save key and schema start in isolated test mode; migration is explicit, versioned, idempotent, covered by tests.
- DO NOT change, delete, or overwrite player data in main before migration tests confirm compatibility.
- v0.1 supports local guest play only; no real account sync or multiplayer backend.

### 8. Quality gates / release control
1. Typecheck and production build succeed.
2. Deterministic tests for state machine and hit windows.
3. Playwright Chromium + WebKit: enter world, move, face, attack, verify enemy HP, die and respawn.
4. Visual regression probes assert advancing sprite frame on walk/attack (not only canvas presence); attack timing and VFX matches actual damage event.
5. Manual real iPhone Safari + desktop: 10-minute session, touch zones, keyboard blur, camera, collision, no overlay.
6. Keep feature flags for rollback; no direct merge to main, no automatic releases.

### 9. Rollback
- Reborn is independent branch. Existing main/deploy stay unchanged.
- No cherry-pick of large mixed changes before audit. Record sources of all reused code.
- Build each testable change into separate commit/PR with ability to revert without touching old player saves.

### 10. Non-goals until vertical slice accepted
Full skill tree, 7 classes, 5 maps, equipment crafting, online multiplayer, boss raid, economy, network auth, global channels, 8-direction finished painted sprites. These remain on product roadmap but are not a prerequisite for the first playable slice.
