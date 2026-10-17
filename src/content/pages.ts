import type { Locale } from "@moom/shared/i18n";

// Long-form copy for /help, /terms, /privacy. Kept out of the UI dictionaries because
// it is prose, but every page still has a Thai and an English version.
// The terms and privacy texts are DRAFTS and need a legal review before launch.

export type Section = { h: string; p: string[] };
export type DocPage = { title: string; intro?: string; draft?: boolean; sections: Section[] };

export const HELP: Record<Locale, DocPage> = {
  th: {
    title: "วิธีใช้ Moom",
    sections: [
      {
        h: "ใส่ alert ใน OBS",
        p: [
          "ไปที่หน้า จอ OBS ในหน้าจัดการ คัดลอกลิงก์ Browser Source",
          "ใน OBS กด + ที่ Sources เลือก Browser วางลิงก์ ตั้งกว้าง 1920 สูง 1080 และติ๊ก Control audio via OBS",
          "กด โดเนททดสอบ ถ้าขึ้นจอและมีเสียงแปลว่าเรียบร้อย",
        ],
      },
      {
        h: "วิดเจ็ตอื่นๆ",
        p: [
          "หน้า วิดเจ็ต OBS มีหลอดเป้าหมาย รายชื่อล่าสุด อันดับ QR ผลโหวต และ Subathon แต่ละอันเป็นลิงก์แยก ใส่เป็น Browser Source ได้หลายอัน",
        ],
      },
      {
        h: "เงินไปไหน และตรวจยอดยังไง",
        p: [
          "คนดูโอนพร้อมเพย์เข้าบัญชีของคุณโดยตรง Moom ไม่ได้ถือเงิน",
          "คนดูแนบสลิปหลังโอน ถ้าตั้งเป็นตรวจเอง รายการจะเข้าหน้า ตรวจยอด ให้คุณเปิดแอปธนาคารดูแล้วกดยืนยัน",
          "ถ้าเปิด SlipOK สลิปที่ถูกต้องจะขึ้นจอทันที รายการที่ระบบไม่แน่ใจจะยังเข้าคิวให้ตรวจ",
          "สลิปใบเดียวใช้ได้ครั้งเดียว ระบบเช็กเลขอ้างอิงของธนาคาร",
        ],
      },
      {
        h: "อนุมัติสลิประหว่างไลฟ์โดยไม่สลับจอ",
        p: ["ใน OBS ไปที่ Docks > Custom Browser Docks ใส่ลิงก์ OBS Dock จากหน้า จอ OBS แล้วล็อกอินในหน้าต่างนั้นครั้งแรก"],
      },
      {
        h: "ปุ่มฉุกเฉิน",
        p: [
          "ปุ่ม หยุดทุกอย่าง ตัดเสียง ซ่อน alert และหยุดคิวจนกว่าจะกดเล่นต่อ ใช้ได้จากหน้าจัดการ Dock หรือ Stream Deck (ลิงก์อยู่ในหน้า จอ OBS)",
        ],
      },
      {
        h: "ขายไฟล์ดิจิทัล",
        p: [
          "เพิ่มสินค้า อัปโหลดไฟล์ (รวมเป็น .zip ถ้ามีหลายไฟล์) แล้วกดวางขาย",
          "คนซื้อจ่ายแบบเดียวกับโดเนท พอยืนยันยอดแล้วจะได้ปุ่มดาวน์โหลดที่หน้าจ่ายเงิน ลิงก์ดาวน์โหลดหมดอายุใน 15 นาที แต่กลับมาขอใหม่ได้เรื่อยๆ จากหน้าเดิม",
        ],
      },
      {
        h: "สัตว์เลี้ยงพูดตามแชท",
        p: ["เปิดสัตว์เลี้ยงและใส่ชื่อช่อง Twitch ในหน้า จอ OBS แล้วผูกสัตว์เลี้ยงกับ username ของคนในแชท ข้อความของคนนั้นจะขึ้นเป็นกล่องคำพูด"],
      },
      {
        h: "เนื้อหาที่ห้าม",
        p: ["ห้ามขายหรือโฆษณาเนื้อหา 18+ สิ่งผิดกฎหมาย หรือผลงานที่ละเมิดลิขสิทธิ์คนอื่น"],
      },
    ],
  },
  en: {
    title: "How Moom works",
    sections: [
      {
        h: "Add alerts to OBS",
        p: [
          "Open OBS overlay in your dashboard and copy the Browser Source link.",
          "In OBS, add a Browser source, paste the link, set 1920×1080 and tick Control audio via OBS.",
          "Press Test tip. If it shows up with sound, you're done.",
        ],
      },
      {
        h: "Other widgets",
        p: ["OBS widgets has a goal bar, recent supporters, leaderboard, QR code, poll results and a subathon timer. Each has its own link."],
      },
      {
        h: "Where the money goes, and how payments are checked",
        p: [
          "Viewers transfer by PromptPay straight to your account. Moom never holds money.",
          "Viewers attach their slip. In manual mode it lands in Review for you to check against your bank app.",
          "With SlipOK on, valid slips go on stream immediately; anything unclear still goes to Review.",
          "Each slip can only be used once (we check the bank reference).",
        ],
      },
      {
        h: "Approve slips without leaving OBS",
        p: ["In OBS, open Docks > Custom Browser Docks, add the OBS Dock link from the overlay page and sign in once inside it."],
      },
      {
        h: "Panic button",
        p: ["Stop everything cuts sound, hides the alert and pauses the queue until you resume. Use it from the dashboard, the dock or a Stream Deck link."],
      },
      {
        h: "Selling digital files",
        p: [
          "Add a product, upload the file (zip several files together) and put it on sale.",
          "Buyers pay the same way as tips. Once confirmed they get a download button on their payment page. Links expire after 15 minutes but they can get a fresh one from that page any time.",
        ],
      },
      {
        h: "Pets that talk from chat",
        p: ["Turn on pets and set your Twitch channel on the overlay page, then link a pet to a chatter's username. Their messages appear in a speech bubble."],
      },
      {
        h: "Not allowed",
        p: ["No adult content, nothing illegal, and nothing that infringes someone else's copyright."],
      },
    ],
  },
};

export const TERMS: Record<Locale, DocPage> = {
  th: {
    title: "ข้อตกลงการใช้งาน",
    draft: true,
    intro: "ฉบับร่าง ยังไม่ผ่านการตรวจทางกฎหมาย",
    sections: [
      { h: "Moom คืออะไร", p: ["Moom เป็นซอฟต์แวร์ช่วยรับเงินสนับสนุน ขายไฟล์ดิจิทัล และแสดงการแจ้งเตือนบนไลฟ์สตรีม Moom ไม่ได้รับ ถือ หรือโอนเงินแทนผู้ใช้ เงินโอนจากผู้สนับสนุนเข้าบัญชีพร้อมเพย์ของสตรีมเมอร์โดยตรง"] },
      { h: "ความรับผิดชอบของสตรีมเมอร์", p: ["สตรีมเมอร์รับผิดชอบสินค้าและเนื้อหาที่ตนขายหรือแสดง การยืนยันยอดเงิน การคืนเงินให้ผู้ซื้อ และภาษีของรายได้ตนเอง"] },
      { h: "เนื้อหาต้องห้าม", p: ["ห้ามเนื้อหาลามกหรือ 18+ สิ่งผิดกฎหมาย การละเมิดลิขสิทธิ์ การหลอกลวง และการใช้ระบบเพื่อฟอกเงิน Moom อาจปิดหน้าหรือบัญชีที่ฝ่าฝืนโดยไม่แจ้งล่วงหน้า"] },
      { h: "การแจ้งละเมิดลิขสิทธิ์", p: ["เจ้าของผลงานแจ้งได้ทางช่องทางติดต่อของ Moom พร้อมหลักฐาน เราจะนำเนื้อหาออกระหว่างตรวจสอบ"] },
      { h: "ข้อจำกัดความรับผิด", p: ["Moom ให้บริการตามสภาพ ไม่รับประกันว่าจะไม่มีข้อผิดพลาด และไม่รับผิดต่อความเสียหายจากการโอนเงินผิดบัญชี สลิปปลอม หรือบริการภายนอกที่ล่ม"] },
    ],
  },
  en: {
    title: "Terms of service",
    draft: true,
    intro: "Draft. Not yet reviewed by a lawyer.",
    sections: [
      { h: "What Moom is", p: ["Moom is software for receiving support, selling digital files and showing stream alerts. Moom does not receive, hold or transfer money on anyone's behalf; supporters pay the streamer's PromptPay directly."] },
      { h: "Streamer responsibilities", p: ["Streamers are responsible for what they sell or show, for confirming payments, for refunds to buyers, and for taxes on their income."] },
      { h: "Prohibited content", p: ["No adult content, nothing illegal, no copyright infringement, no scams, and no money laundering. Moom may close pages or accounts that break these rules without notice."] },
      { h: "Copyright complaints", p: ["Rights holders can contact Moom with evidence. We take the content down while we look into it."] },
      { h: "Liability", p: ["Moom is provided as is, without a guarantee of being error-free, and is not liable for transfers to the wrong account, forged slips, or outages of third-party services."] },
    ],
  },
};

export const PRIVACY: Record<Locale, DocPage> = {
  th: {
    title: "นโยบายความเป็นส่วนตัว",
    draft: true,
    intro: "ฉบับร่าง ยังไม่ผ่านการตรวจทางกฎหมาย (PDPA)",
    sections: [
      { h: "ข้อมูลที่เก็บ", p: ["สตรีมเมอร์: อีเมล ชื่อที่แสดง เลขพร้อมเพย์ และการตั้งค่า", "ผู้สนับสนุน: ชื่อที่พิมพ์ ข้อความ ยอดเงิน รูปสลิป และอีเมล (เฉพาะตอนซื้อสินค้า)"] },
      { h: "ใช้ทำอะไร", p: ["เพื่อแสดงหน้าร้าน สร้าง QR ตรวจยอดเงิน ส่งไฟล์ที่ซื้อ และแสดงการแจ้งเตือนบนไลฟ์ เราไม่ขายข้อมูลให้ใคร"] },
      { h: "ผู้ประมวลผลภายนอก", p: ["Supabase (ฐานข้อมูลและไฟล์), SlipOK (ตรวจสลิป ถ้าเปิดใช้), Microsoft (สร้างเสียงอ่านข้อความ), Vercel (โฮสต์เว็บ)"] },
      { h: "สิทธิ์ของคุณ", p: ["สตรีมเมอร์ดาวน์โหลดข้อมูลทั้งหมดและลบบัญชีได้เองในหน้าตั้งค่า ผู้สนับสนุนขอลบข้อมูลได้ผ่านสตรีมเมอร์หรือช่องทางติดต่อของ Moom"] },
      { h: "ระยะเวลาเก็บ", p: ["เก็บไว้ตลอดอายุบัญชีของสตรีมเมอร์ เมื่อลบบัญชี ข้อมูลและไฟล์ที่เกี่ยวข้องจะถูกลบด้วย"] },
    ],
  },
  en: {
    title: "Privacy policy",
    draft: true,
    intro: "Draft. Not yet reviewed by a lawyer (PDPA).",
    sections: [
      { h: "What we collect", p: ["Streamers: email, display name, PromptPay ID and settings.", "Supporters: the name they type, message, amount, slip image, and email (only when buying)."] },
      { h: "What it's for", p: ["Showing the page, making QR codes, checking payments, delivering purchased files and showing stream alerts. We don't sell data."] },
      { h: "Processors", p: ["Supabase (database and files), SlipOK (slip checks, if enabled), Microsoft (text-to-speech), Vercel (hosting)."] },
      { h: "Your rights", p: ["Streamers can download all their data and delete their account in Settings. Supporters can ask the streamer or Moom to delete their data."] },
      { h: "Retention", p: ["Kept for the life of the streamer's account; deleting the account deletes the related data and files."] },
    ],
  },
};
