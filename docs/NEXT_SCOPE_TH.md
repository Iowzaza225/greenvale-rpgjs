# ขอบเขตใหม่ — Greenvale Afterfall 2.5D

ยึดคำสั่งผู้ใช้ 15 ตุลาคม 2026 เป็นขอบเขตเป้าหมาย ไม่ใช่รายการที่เสร็จทั้งหมด

## รอบ 0.8.1 ที่นำไปทดสอบได้
- I กระเป๋า loot จริงจากเซฟ, Q เควสแรก, Tab เป้าหมาย, K สกิล, C ค่าพลัง
- WASD/ลูกศรใช้เส้นทางตรวจการชนเดียวกัน; หยุดเมื่อเสียโฟกัส/เปิดหน้าต่าง
- หน้าต่างคอมเปิดคู่กัน ลากจากหัวหน้าต่าง จัดลำดับซ้อน ปิดชั้นบนด้วย Esc
- HUD ไม่ทับปุ่มต่อสู้ที่ 1280×720 และ 1280×800; มือถือใช้หน้าต่างเดิม
- ลากสกิลด้วยเมาส์ไม่ต้องกดค้าง; touch คง long press และยกเลิกไม่ลงช่อง
- ฉาก 5 โซนเป็น oblique 2.5D: พื้น XY, อาคาร/ต้นไม้/หินมีความสูง เงา และ depth sorting
- ข้อมูลภาพ/การชนอยู่ใน JSON ร่วมกัน; เปลี่ยนแมพแล้วทำลาย graphics เก่า

## Phase 4A ที่ยังต้องตรวจด้วยอุปกรณ์จริง
- iPhone Safari touch drag, fullscreen ตามความสามารถเบราว์เซอร์
- ขนาดหน้าต่างและ tooltip กับจอ/เมาส์/คีย์บอร์ดหลายแบบ
- gamepad ยังไม่ทำ และไม่สร้างไฟล์เปล่าให้ดูเหมือนรองรับ

## Phase 4B ที่ยังต้องทำ
- Audit status/aggro และ native-input parity ทั้งมือถือ/คอม
- ค่ายในข้อมูลเป็น safeZone แต่ยังมี training wolves เดิม: ต้องย้าย encounter
  และปรับ tutorial/QA ก่อนประกาศว่าเมืองปลอดภัยจริง
- กระเป๋ารอบนี้แสดง loot ที่มีอยู่จริง ยังไม่ใช่ระบบอุปกรณ์/ใช้ไอเทม/คลังครบชุด
- เควสแสดงความคืบหน้าภารกิจแรก ยังไม่ใช่หลายเควสพร้อมกัน

## Phase 5A / 5B
- Art Bible เพิ่มกติกา 2.5D แล้ว แต่ภาพยังเป็น procedural prototype
- ตัวละคร 7 อาชีพต้องมี idle/walk/run/attack/cast/hit/death/sit/emote แยกจริง
- costume overlay บนตัวที่เล่น, มอนสเตอร์โจมตี/ตาย, NPC portraits ยังต้องทำ
- ไอคอน status/item, VFX hit/crit/block/miss/heal/buff/debuff/loot/level/warp
  ต้องทำชุดสุดท้ายและตรวจโหลดบน iPhone ไม่ถือว่า procedural placeholders คือเสร็จ

## Phase 6
- เส้นทาง Greenvale → Training Plains 1–10 → Mutant Grove 10–20 →
  Stoneburrow Cavern 20–30 → Rotten Core มีอยู่ และรอบนี้เปลี่ยน renderer
- ยังต้องทำ tileset/props ขั้นสุดท้าย, ร้านค้า/คลัง, save points,
  minimap labels/quest markers และ boss arena trigger ที่ทำงานจริง
- channels 1–3 ปัจจุบันเป็น config เท่านั้น ยังไม่มี backend ห้องร่วมกัน
- ห้ามแสดงว่ารองรับ multiplayer หรือช่องจริงเพียงเพราะมี dropdown/config

## Gate ก่อนรวม main
Build + desktop regression + WebKit Phase 0–4 ต้องผ่าน และเล่นทดสอบจริงบน
มือถือ/คอมก่อนรวม main ตามกระบวนการ Preview เดิม
