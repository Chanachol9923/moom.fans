# Moom

แพลตฟอร์มสำหรับสตรีมเมอร์ / VTuber ไทย: หน้าโดเนทพร้อมเพย์ + ร้านไฟล์ดิจิทัล + alert บน OBS
อยู่ใต้ซับโดเมน `<ชื่อ>.moom.fans`

- เงินโดเนทและค่าสินค้า **โอนเข้าพร้อมเพย์ของสตรีมเมอร์โดยตรง** Moom ไม่ถือเงินใคร
- ยืนยันยอดด้วยการกดยืนยันเองในหน้า "ตรวจยอด" หรืออัตโนมัติด้วย SlipOK (ถ้ามี key)
- ระบบเก็บเงินของแพลตฟอร์ม (เครดิต, Stripe Connect) **ยังไม่ทำ** ตั้งใจเว้นไว้ทีหลัง

## สถานะตอนนี้

| ส่วน | สถานะ |
|---|---|
| หน้าแรก, ล็อกอิน (magic link), onboarding | ✅ เขียนแล้ว |
| หน้าร้าน `<slug>.โดเมน` + ฟอร์มโดเนท + media share link | ✅ |
| หน้าจ่ายเงิน: QR พร้อมเพย์ใส่ยอด, นับถอยหลัง, บันทึก QR, แนบสลิป, รอสถานะ | ✅ |
| คิวตรวจยอด (อนุมัติ/ปฏิเสธ, อนุมัติคลิป) | ✅ |
| SlipOK อัตโนมัติ + ตรวจยอด/ผู้รับ/สลิปเก่า/สลิปซ้ำ | ✅ โค้ดพร้อม · ⚠️ ยังไม่ได้ทดสอบกับ API จริง |
| ร้านไฟล์: อัปโหลดไฟล์/ปก/เสียงตัวอย่าง, วางขาย, ลิงก์ดาวน์โหลด 15 นาที, โหลดซ้ำได้ | ✅ |
| Overlay OBS: คิว FIFO, เสียงแจ้งเตือน, TTS, แถบเวลา, ตำแหน่ง, panic/skip/resume | ✅ |
| TTS (Edge-TTS ฝั่ง server) | ✅ ทดสอบกับ Microsoft จริงแล้ว ได้ MP3 ภาษาไทย |
| Media share (YouTube) + อนุมัติก่อนเล่น | ✅ |
| VTube Studio: hotkey + ปาไอเทม ตามยอด | ✅ โค้ดพร้อม · ⚠️ ยังไม่ได้ทดสอบกับ VTS จริง |
| สัตว์เลี้ยง pixel 4 แบบ + ตัววาดเอง 16×16 + พูดตามแชท Twitch | ✅ |
| ประวัติรายการ/ดาวน์โหลด, ตั้งค่าโปรไฟล์/พร้อมเพย์ | ✅ |
| ภาษาไทย + อังกฤษ ครบทุกหน้า | ✅ |
| **ตกแต่งหน้า**: 5 ธีม, พื้นหลัง (จุด/ตาราง/ตาหมากรุก/รูป), สีกรอบ, ข้อความกล่องโดเนท/ปุ่ม/ขอบคุณ, เรียง/ซ่อนส่วน, สัตว์เลี้ยงข้างรูป, พรีวิวสด | ✅ |
| **หน่วยของขวัญ** แบบ Trakteer/BMC (เช่น ข้าวโพด ×3) | ✅ |
| **โดเนทไม่ระบุชื่อ** + เลือกไม่แสดงในรายชื่อ (แบบ TermTem) | ✅ |
| **เป้าหมายโดเนท** (ยอดเริ่มต้น, วันจบ, นับยอดขายหรือไม่) แบบ Ko-fi/Streamlabs | ✅ |
| **กระดานผู้สนับสนุน**: ล่าสุด + อันดับ 30 วัน/ตลอดกาล บนหน้าร้าน | ✅ |
| **วงล้อสุ่ม** แบบ Toonation (น้ำหนักต่อช่อง, ผลสุ่มฝั่ง server) | ✅ |
| **โหวต** แบบ Saweria (นับตามยอดหรือตามครั้ง) | ✅ |
| **Subathon timer** แบบ Trakteer (เพิ่มเวลาอัตโนมัติแบบ atomic) | ✅ |
| **วิดเจ็ต OBS 6 ตัว**: เป้า, รายชื่อล่าสุด, อันดับ, QR, โหวต, subathon (`/widget/<token>/<kind>`) | ✅ |
| **รูปแบบ alert** การ์ด / กะทัดรัด / แถบยาว | ✅ |
| **คุมคิว alert**: ดูคิว, เอาออก, เล่นซ้ำ แบบ Saweria/Trakteer overlay control | ✅ |
| **OBS Dock** (`/dock`) อนุมัติสลิป/คลิป + หยุดฉุกเฉินจากใน OBS | ✅ |
| หน้าผู้สนับสนุน (รวมยอดตามชื่อ), ดาวน์โหลดข้อมูล + ลบบัญชี (PDPA) | ✅ |
| หน้า วิธีใช้ / ข้อตกลง / ความเป็นส่วนตัว / 404 | ✅ ข้อตกลงกับนโยบายเป็น **ร่าง** ต้องให้นักกฎหมายตรวจ |
| ระบบสมาชิกรายเดือน, การเก็บเงินของแพลตฟอร์ม, คิวเล่นกับคนดู (Mabar) | ⏸ ทีหลัง |

ตรวจแล้ว: `npm test` (82 เทสต์ รวม schema + RLS บน Postgres จำลอง), `npm run lint`, `npm run build` ผ่านหมด
ส่วนที่ต้องมีฐานข้อมูลจริง (ล็อกอิน, จ่ายเงินจริง, realtime) **ยังไม่ได้รันจริง** เพราะเครื่องยังไม่มี Docker

## ฟีเจอร์ที่ดูมาจากเจ้าอื่น

ดูจาก Ko-fi, Streamlabs, TipMe (กำลังปิดให้บริการปี 2026), TermTem, Saweria, Trakteer, Buy Me a Coffee, Toonation
แล้วปรับให้เข้ากับวิธีจ่ายของเรา (พร้อมเพย์เข้าบัญชีสตรีมเมอร์ตรง + ตรวจสลิป)

## ต้องเตรียม / ยังไม่มี

เรียงตามลำดับที่ควรทำ

1. **ติดตั้ง Docker Desktop** (จำเป็นสำหรับ Supabase ในเครื่อง ตามที่เลือกข้อ 2B) แล้วทำตาม "เริ่มในเครื่อง" ด้านล่าง
2. **ทดสอบ flow จริงครั้งแรก**: สมัคร → onboarding → โดเนทตัวเอง → อนุมัติ → alert ขึ้น OBS
3. **SlipOK**: สมัครที่ slipok.com เอา API key + Branch ID มาใส่ `.env.local` แล้วลองสลิปจริง 1-2 ใบ
   รูปแบบ response ของ SlipOK ในโค้ด (`src/lib/slipok.ts`) เขียนจากเอกสาร ต้องเช็กกับของจริง
4. **VTube Studio**: เปิด API แล้วลองหน้า VTube Studio ใน dashboard + ลองใน OBS
   (ต้องดูว่า OBS browser source ต่อ `ws://localhost:8001` ได้จริงไหม)
5. **Discord / Google login**: สร้าง OAuth app → ใส่ client id/secret ใน `supabase/config.toml` + `supabase/.env` → เปิด `NEXT_PUBLIC_AUTH_*=true`
6. **โดเมน** (ยังไม่ได้ซื้อ) + **Supabase cloud** + **Vercel** ตอนจะขึ้นจริง
   Vercel ต้องใช้ nameserver ของ Vercel ถึงจะทำ wildcard `*.moom.fans` ได้
7. **ก่อนเปิดให้คนอื่นใช้**
   - Rate limit ตอนนี้เป็นแบบในหน่วยความจำ ใช้ได้แค่ระดับกันกดรัว ควรเปลี่ยนเป็น Upstash/Redis
   - อีเมลส่งลิงก์ดาวน์โหลดให้คนซื้อยังไม่มี (ตอนนี้คนซื้อกลับมาโหลดจากลิงก์หน้าจ่ายเงิน) ต้องมีผู้ให้บริการอีเมล เช่น Resend
   - Edge-TTS เป็นช่องทางไม่เป็นทางการของ Microsoft ถ้าจะขายจริงควรเปลี่ยนเป็น Azure/Google TTS (สลับได้ที่ `src/lib/tts/index.ts`)
   - ไฟล์สินค้าจำกัด 50 MB (ขีดของ Supabase free) ถ้าจะใหญ่กว่านี้ย้ายไป R2 (แก้ที่ `src/lib/storage*.ts`)
   - ToS / Privacy Policy (PDPA) และนโยบายห้ามเนื้อหา 18+
8. **ทีหลัง**: การเก็บเงินของแพลตฟอร์ม, ระบบสมาชิกรายเดือน, แอป Tauri (global hotkey, เสียงแยก device), YouTube chat สำหรับสัตว์เลี้ยง

## ใช้ Supabase บน cloud (แทน Docker)

1. ใส่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ใน `.env.local` (ไฟล์นี้ถูก git ignore ไว้)
2. ใส่ `SUPABASE_SECRET_KEY` (Settings > API Keys > secret) ใน `.env.local` เช่นกัน **ห้าม commit**
3. สร้างตาราง: เปิด Supabase > SQL Editor แล้ววางเนื้อหาทั้งไฟล์ `supabase/migrations/*.sql` เรียงตามชื่อ
   หรือใช้ CLI: `npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push`
4. Authentication > URL Configuration: ใส่ Site URL `http://localhost:3000` และ Redirect URL `http://localhost:3000/**`
   (ค่าใน `supabase/config.toml` ใช้กับ Docker เท่านั้น ไม่มีผลกับ cloud)
5. อีเมล magic link ของ Supabase ที่ให้มาในตัวส่งได้จำกัดมากต่อชั่วโมง ถ้าจะใช้จริงต้องตั้ง SMTP ของตัวเอง

### ปิงฐานข้อมูลทุกวัน (กันโปรเจกต์ฟรีถูกพัก)

โปรเจกต์ฟรีของ Supabase ถูกพักถ้าไม่มี database activity ครบ 7 วัน ([เอกสาร](https://supabase.com/docs/guides/platform/free-project-pausing)) มีตัวปิงให้ 2 ทาง ทำงานพร้อมกันได้:
- **GitHub Actions** (`.github/workflows/keepalive.yml`) ทำงานได้ตั้งแต่ตอนนี้ แม้ยังไม่ deploy:
  ไปที่ repo > Settings > Secrets and variables > Actions เพิ่ม `SUPABASE_URL` กับ `SUPABASE_PUBLISHABLE_KEY` แล้วกด Run workflow ที่แท็บ Actions เพื่อลอง
- **Vercel Cron** (`vercel.json` → `/api/cron/keepalive`) ทำงานหลัง deploy

ต้องสร้างตารางก่อน (ข้อ 3) เพราะตัวปิงอ่านตาราง `profiles` เมื่ออัปเป็น Pro แล้วลบตัวปิงทิ้งได้

## เริ่มในเครื่อง (Docker)

```bash
npm install
npm run db:start          # ต้องเปิด Docker Desktop ก่อน ครั้งแรกโหลดนาน
```

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจากผลของ `db:start`
(Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, Secret key → `SUPABASE_SECRET_KEY`)

```bash
npm run dev
```

- เว็บหลัก: http://localhost:3000
- หน้าร้าน: http://<slug>.localhost:3000 (Chrome/Edge ใช้ได้เลย)
- อีเมล magic link ตอน dev: http://127.0.0.1:54324 (Mailpit)
- Supabase Studio: http://127.0.0.1:54323
- ลอง overlay โดยไม่ต้องมีฐานข้อมูล: http://localhost:3000/overlay/demo (ใส่ `?style=compact` หรือ `?style=banner` ได้)
- ลองวิดเจ็ต: http://localhost:3000/widget/demo/goal (หรือ recent, top, qr, poll, subathon)
- ดูหน้าร้าน/หน้าตกแต่ง/หน้าจ่ายเงิน/ตัววาด pixel ด้วยข้อมูลตัวอย่าง (dev เท่านั้น): http://localhost:3000/dev/preview (ใส่ `&theme=night&bg=grid&unit=1` ได้)

ใส่ใน OBS: Sources → + → Browser → วางลิงก์จากหน้า "จอ OBS" · กว้าง 1920 สูง 1080 · ติ๊ก *Control audio via OBS*

คำสั่งอื่น: `npm test`, `npm run lint`, `npm run typecheck`, `npm run db:reset` (ล้างฐานข้อมูลแล้วรัน migration ใหม่)

## โครงสร้าง

```
supabase/migrations/     schema + RLS + storage buckets (แหล่งความจริงของฐานข้อมูล)
src/proxy.ts             แยก host: <slug>.โดเมน → /s/<slug>, refresh session ของ dashboard
src/app/(site)/          หน้าเว็บทั้งหมด (layout มีฟอนต์ + i18n)
  page.tsx               หน้าแรก
  login/ onboarding/     เข้าสู่ระบบ, ตั้งร้านครั้งแรก
  dashboard/             หน้าจัดการ + actions.ts (server actions ทั้งหมด)
  s/[slug]/              หน้าร้าน + pay/[token] หน้าจ่ายเงิน
  dev/preview/           แกลเลอรีหน้าจอด้วยข้อมูลตัวอย่าง (dev เท่านั้น)
src/app/(overlay)/       root layout โปร่งใสสำหรับ OBS
src/app/api/             public/[slug]/tx, tx/[token]/{qr,slip,download}, overlay/[token]/…, control/…
src/lib/domain/          logic หลัก: transactions (สร้าง/สลิป/ยืนยัน), alerts, overlay state
src/lib/                 promptpay (EMVCo QR), slipok, tts, realtime, storage, i18n, pets, vts, hosts
src/components/          UI pixel (ui.tsx, AlertBox, PixelSprite) + overlay/
```

### หลักที่ใช้

- **ใครเขียนอะไร**: ตารางที่สตรีมเมอร์แก้เอง (profiles, overlay_settings, products, pets) เขียนผ่าน session ของผู้ใช้ ให้ RLS คุม
  ส่วนเงินและข้าม tenant (transactions, alerts, tokens) เขียนโดย server ด้วย service role หลังเช็กสิทธิ์เองเท่านั้น
- **คนดูไม่ต้องมีบัญชี**: ทุกการจ่ายเงินมี `public_token` เป็นกุญแจของหน้าจ่ายเงิน/ดาวน์โหลด
- **ยืนยันยอดครั้งเดียว**: `verifyTransaction` อัปเดตแบบมีเงื่อนไข คนที่มาก่อนเท่านั้นที่ได้สร้าง alert (กันกดซ้ำ/SlipOK ชนกับกดมือ) และ `slip_trans_ref` unique กันสลิปใบเดียวจ่ายสองรายการ
- **Overlay**: ดึงคิวทุก 10 วินาที + Supabase Realtime broadcast เป็นตัวสะกิดให้ดึงเร็วขึ้น · alert ถูก "claim" ก่อนเล่น OBS หลายฉากจึงไม่เล่นซ้ำ · ลิงก์ overlay เป็นความลับ สร้างใหม่ได้
- **i18n**: `src/lib/i18n/dict/th.ts` เป็นต้นแบบ, `en.ts` ต้องมีครบทุก key (TypeScript บังคับ)
- **หน้าตา**: pixel ด้วย box-shadow (`.px-frame`, `.px-btn` ใน `globals.css`), ฟอนต์ Pixelify Sans + Chakra Petch + IBM Plex Sans Thai, ตัวเลขเงินใช้ `.font-num` ให้อ่านชัด
