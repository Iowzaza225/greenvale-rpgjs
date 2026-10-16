# GREENVALE AFTERFALL — REBORN
## Roadmap, migration inventory & release checklist v0.1

### ปัญหาจากการตรวจ ไม่ใช่ข้อกล่าวอ้างว่าแก้สำเร็จแล้ว
- main เป็น base เก่ากว่าชุด phase; การนำ PR รุ่นใหม่มา merge ต่อกันอาจเกิดพฤติกรรมชนกัน
- สาย desktop/world (PR #15/#16) และสาย mobile animation (PR #17) ไม่อยู่บน parent เดียวกัน
- PR #17 ทดสอบว่ามี atlas หลาย animation banks แต่ runtime ยังไม่ได้เรียกทุกท่าที่ต้องการอย่างครบถ้วน
- Artwork ของทั้งสองสายยังเป็น prototype ไม่ใช่ smooth hand-painted final animation
- ค่ายมี metadata safeZone แต่ legacy wolves ยังไม่ย้ายออก (บันทึก PR #15)

### Milestone 0 — Audit / Design freeze [เริ่มในเอกสารชุดนี้]
- [x] แยกสาขาออกจาก main โดยไม่แตะ production
- [x] จัด GDD, architecture, QA gates สำหรับ 1 map + 1 hero + 1 enemy
- [ ] สำรวจ diff ที่แน่นอนของ phase/4, PR #15/16/17 และเลือก source ที่จะ reuse
- [ ] บันทึก baseline commit SHAs และ smoke results
- [ ] วางผัง asset อ้างอิงภาพ/ตัวละครที่ผู้ใช้ยอมรับ
**Gate M0:** ไม่เพิ่มฟีเจอร์จนมี source-of-truth และ acceptance criteria สำหรับ vertical slice

### Milestone 1 — Boot / Input / Collision
- [ ] RPGJS boots บน iPhone WebKit + desktop Chromium
- [ ] player move/stop/turn, camera follows, sprite foot aligned to collision
- [ ] mobile joystick + desktop WASD/arrows use same game action contract
- [ ] focus loss cancels held inputs; walls/props collide predictably
**Gate M1:** 3-minute walking test on both devices without freezing

### Milestone 2 — Animation integration
- [ ] real sprite frame progression for idle/walk/attack/hit/death (Novice, wolf)
- [ ] facing 4-direction, renderer tracks actor gameplay state
- [ ] no static pasted pictures posing as animation; test verifies frame progression
- [ ] asset budget evaluated with actual mobile profiler; temporary art labeled prototype
**Gate M2:** manual video review and automated frame-state assertions pass

### Milestone 3 — Combat loop
- [ ] target lock, range, attack hit window, enemy HP, incoming attack
- [ ] wolf idle/chase/attack/death deterministic loop, bounded population
- [ ] damage number feedback matches resolved hits only
- [ ] death/respawn resets physics, input and graphics once
**Gate M3:** repeat encounter 10 times on mobile + PC without fatal error

### Milestone 4 — Usability and content handoff
- [ ] responsive HUD mobile and desktop, proper pointer vs touch
- [ ] Thai/English first-slice translation, audio/VFX graceful fallback
- [ ] guest save v0.1 isolated; no mutation of old saved profiles
- [ ] 10-minute physical iPhone and desktop acceptance tests with logged results
**Gate M4:** user accepts playable vertical slice; only then roadmap expands

### Migration matrix
| Existing code/source | Decision | Why / check |
|---|---|---|
| main RPGJS v5 + Vite + basic boot | Reuse with measured refactor | engine need not be replaced prematurely |
| phase/4-combat rule resolver | Candidate reuse | verify hit timing + status and actual gameplay |
| phase/5 mobile art + atlas generator | Candidate reference/prototype | available banks != runtime fully wired |
| PR #15 desktop input/panel handling | Candidate selective reuse | verify shortcuts/focus/touch coexist |
| PR #15 map geometry/depth sorting | Candidate selective reuse | small scene first, collider parity |
| PR #16 generated sprites | Design reference only initially | prototype, branch overlaps PR #15 |
| legacy save schemas / data IDs | Read-only until migration plan proven | no player data loss |
| existing 5-map / 7-class / 11-monster datasets | Preserve for later phases | not needed to prove v0.1 |
| multiplayer placeholder channel config | Do not ship as live multiplayer | lacks real backend |

### Manual QA checklist (repeat on physical iPhone and desktop)
- [ ] Fresh visit shows build id (debug only) then loads playable world
- [ ] No blank screen, missing assets, crash overlay or endless spinner
- [ ] Player idles, walks, turns facing appropriately; frame changes visible
- [ ] Player does not walk through collision props; camera remains centered
- [ ] Attack button/Space/J triggers complete attack animation; contact aligns with resolved hit
- [ ] Out-of-range attacks never reduce enemy HP; within-range attacks do
- [ ] Wolf chases within aggro radius, attacks at range, stops and dies once
- [ ] Player death returns to safe spawn; input/hp/animations recover
- [ ] Touch/keyboard and focus reset work; UI never traps input permanently
- [ ] 10-minute loop no catastrophic FPS decline, steadily increasing sprite count or duplicate enemy
- [ ] Thai/English UI labels do not overflow narrow screens
- [ ] Previous game/save data untouched

### Release policy
- All REBORN work first goes to feature branch and preview-only Draft PR.
- NO auto-merge, NO overwrite of main, NO claim that screenshots / automated build alone prove real gameplay.
- A failed gate blocks the following phase. Preserve last green playable build, rollback isolated change, fix and retest.
- When vertical slice is accepted, start Stage 2: art polish, quest, gear UI, more mobs and maps one feature at a time.

### Future user decisions (not blockers to planning)
Final painted sprite style reference, exact target iPhone performance tier, and combat feel (fast vs weighty) can be chosen by observing the first working slice rather than guessing today.
