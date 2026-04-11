// Content sections data management
// Uses localStorage pattern (same as lottery_types)

export interface ContentSection {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    content: string;
    is_visible: boolean;
    sort_order: number;
}

const STORAGE_KEY = 'site_content_pages';

export const DEFAULT_CONTENT: ContentSection[] = [
    {
        id: 'about-us',
        title: 'รู้จักเรา',
        subtitle: 'About Us',
        icon: '🏢',
        content: `American Lottery Thailand เป็นตัวแทนจำหน่ายลอตเตอรี่อเมริกาอย่างเป็นทางการ ให้บริการซื้อหวย Powerball และ Mega Millions ผ่านแอปพลิเคชัน LINE Mini App อย่างสะดวกและปลอดภัย

เรามีทีมงานมืออาชีพที่พร้อมดูแลลูกค้าตลอด 24 ชั่วโมง พร้อมระบบการจ่ายเงินรางวัลที่โปร่งใสและรวดเร็ว`,
        is_visible: true,
        sort_order: 1,
    },
    {
        id: 'real-winners',
        title: 'ผู้ถูกรางวัลจริง',
        subtitle: 'Real Winners',
        icon: '🏆',
        content: `🎉 ลูกค้าของเราถูกรางวัลจริง!

• คุณสมชาย — ถูก Powerball Match 4 + PB รับเงิน $50,000
• คุณวิภา — ถูก Mega Millions Match 3 + MB รับเงิน $200
• คุณณัฐ — ถูก Powerball Match 5 รับเงิน $1,000,000

ผลรางวัลทั้งหมดสามารถตรวจสอบได้จากหน้า "ผลรางวัลของฉัน" ในแอป`,
        is_visible: true,
        sort_order: 2,
    },
    {
        id: 'how-it-works',
        title: 'วิธีเล่นง่ายๆ',
        subtitle: 'How It Works',
        icon: '📋',
        content: `ขั้นตอนง่ายๆ เพียง 4 ขั้นตอน:

1️⃣ เลือกหวย — เลือก Powerball หรือ Mega Millions
2️⃣ เลือกเลข — เลือกเลขเอง หรือกด QP สุ่มอัตโนมัติ
3️⃣ ชำระเงิน — โอนเงินและแนบสลิป
4️⃣ รอผล — ระบบจะตรวจผลให้อัตโนมัติ แจ้งเตือนทันที!

💡 สามารถเลือกหลาย Lines ในออร์เดอร์เดียวกันได้`,
        is_visible: true,
        sort_order: 3,
    },
    {
        id: 'claim-prize',
        title: 'รับเงินรางวัลยังไง',
        subtitle: 'Claim Your Prize',
        icon: '💰',
        content: `เมื่อคุณถูกรางวัล ขั้นตอนรับเงินมีดังนี้:

🏅 รางวัลไม่เกิน $600
→ โอนเข้าบัญชีภายใน 3-5 วันทำการ

🏅 รางวัล $600 - $5,000
→ ดำเนินเอกสารยืนยันตัวตน → โอนภายใน 7-14 วัน

🏅 รางวัลมากกว่า $5,000
→ ทีมงานจะติดต่อเพื่อประสานงานเรื่องภาษีและการรับเงิน

📞 มีคำถาม? ติดต่อทีมงานได้ตลอด 24 ชม.`,
        is_visible: true,
        sort_order: 4,
    },
    {
        id: 'transparent-fees',
        title: 'ค่าบริการชัดเจน',
        subtitle: 'Transparent Fees',
        icon: '💎',
        content: `เราเชื่อในความโปร่งใส ค่าบริการแสดงชัดเจนทุกขั้นตอน:

💵 ราคาต่อ Line — แสดงหน้าเลือกเลข
🔧 ค่าบริการ — แสดงแยกชัดเจน
💳 รวมทั้งหมด — แสดงก่อนชำระเงิน

❌ ไม่มีค่าใช้จ่ายแอบแฝง
❌ ไม่มีค่าธรรมเนียมเพิ่มเติม
✅ สิ่งที่เห็นคือสิ่งที่จ่าย`,
        is_visible: true,
        sort_order: 5,
    },
    {
        id: 'secure-trusted',
        title: 'มั่นใจ ปลอดภัย',
        subtitle: 'Secure & Trusted',
        icon: '🔒',
        content: `ระบบของเราได้รับการออกแบบเพื่อความปลอดภัยสูงสุด:

🔐 เข้าสู่ระบบผ่าน LINE — ไม่ต้องสร้างบัญชีใหม่
🛡️ ข้อมูลส่วนตัวถูกเข้ารหัส — ปกป้องทุกการทำธุรกรรม
📋 ตั๋วหวยจริง — ซื้อจากร้านค้าอย่างเป็นทางการในสหรัฐฯ
✅ ตรวจผลอัตโนมัติ — จากแหล่งข้อมูลทางการรัฐบาล`,
        is_visible: true,
        sort_order: 6,
    },
    {
        id: 'faq',
        title: 'คำถามที่พบบ่อย',
        subtitle: 'FAQ',
        icon: '❓',
        content: `ถาม: ซื้อหวยอเมริกาถูกกฎหมายไหม?
ตอบ: การซื้อหวยอเมริกาผ่านตัวแทนเป็นรูปแบบที่ถูกกฎหมายในสหรัฐอเมริกา

ถาม: ผลรางวัลประกาศเมื่อไหร่?
ตอบ: Powerball ออกทุกวัน จ./พ./ส. และ Mega Millions ออกทุกวัน อ./ศ. (เวลาไทย ประมาณ 10:00 น.)

ถาม: ถ้าถูกรางวัลจะรู้ได้ยังไง?
ตอบ: ระบบจะตรวจสอบอัตโนมัติและแจ้งเตือนผ่าน LINE ทันที

ถาม: รับเงินรางวัลผ่านช่องทางไหน?
ตอบ: โอนเข้าบัญชีธนาคารที่ลงทะเบียนไว้`,
        is_visible: true,
        sort_order: 7,
    },
    {
        id: 'contact-us',
        title: 'ติดต่อเรา',
        subtitle: 'Contact Us',
        icon: '📞',
        content: `ติดต่อทีมงานได้หลายช่องทาง:

📱 LINE Official: @americanlottery
📧 Email: support@americanlottery.th
⏰ เวลาทำการ: ทุกวัน 09:00 - 22:00 น.

💬 แชทกับเราผ่าน LINE ได้เลย — ตอบไวภายใน 5 นาที!`,
        is_visible: true,
        sort_order: 8,
    },
    {
        id: 'terms',
        title: 'ข้อกำหนดและเงื่อนไข',
        subtitle: 'Terms & Conditions',
        icon: '📄',
        content: `เงื่อนไขการใช้บริการ:

1. ผู้ใช้ต้องมีอายุ 18 ปีขึ้นไป
2. การซื้อหวยทุกรายการเป็นที่สิ้นสุด ไม่สามารถยกเลิกหลังชำระเงินแล้ว
3. ผลรางวัลอ้างอิงจากการประกาศอย่างเป็นทางการของรัฐบาลสหรัฐฯ
4. เงินรางวัลจะถูกหักภาษี ณ ที่จ่ายตามกฎหมายที่เกี่ยวข้อง
5. บริษัทขอสงวนสิทธิ์ในการเปลี่ยนแปลงเงื่อนไขโดยไม่ต้องแจ้งล่วงหน้า

© 2026 American Lottery Thailand. สงวนลิขสิทธิ์.`,
        is_visible: true,
        sort_order: 9,
    },
];

export function getContentSections(): ContentSection[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // ignore
    }
    // Initialize with defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONTENT));
    return DEFAULT_CONTENT;
}

export function saveContentSections(sections: ContentSection[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
}
