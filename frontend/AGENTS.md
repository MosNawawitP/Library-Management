<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Front-end Visual Rules

กฎส่วนนี้ใช้กับ UI และ visual assets ทั้งหมดภายใน `frontend/`:

- ห้ามใช้สีแบบ gradient ในงานที่สร้างใหม่หรือแก้ไข ไม่ว่าจะเป็น CSS
  `linear-gradient`, `radial-gradient`, `conic-gradient`, Tailwind gradient
  utilities, SVG gradient fills หรือ gradient background ใน image assets
- ใช้สีทึบเป็นหลัก และสร้างลำดับชั้นของ UI ด้วย spacing, typography, border,
  shadow และ opacity ที่พอเหมาะ
- เมื่อแก้ component ที่มี gradient อยู่เดิม ให้เปลี่ยน gradient ภายในขอบเขตที่แก้
  เป็นสีทึบด้วย เพื่อไม่ให้มี visual style ที่ดูสร้างโดย AI มากเกินไป
- ห้ามเพิ่ม gradient กลับเข้ามา เว้นแต่ผู้ใช้จะยกเลิกหรือแก้ไขกฎนี้อย่างชัดเจน
- UI icons ต้องใช้จากแพ็กเกจ `lucide-react` เป็นค่าเริ่มต้น ห้ามสร้าง inline SVG,
  Unicode icon หรือใช้ icon library อื่นซ้ำซ้อน
- Brand logo, ภาพประกอบ และ visual asset ที่ไม่ใช่ UI icon ไม่ต้องเปลี่ยนเป็น
  Lucide icon
