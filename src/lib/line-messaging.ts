import { Client, TextMessage, FlexMessage, FlexBubble } from '@line/bot-sdk';

let _client: Client | null = null;

function getClient(): Client {
    if (!_client) {
        _client = new Client({
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
        });
    }
    return _client;
}

const MINI_APP_ID = process.env.NEXT_PUBLIC_LINE_MINI_APP_ID || '';
const APP_URL = `https://miniapp.line.me/${MINI_APP_ID}`;

// Helper: build a styled Flex Bubble for notifications
function buildNotificationFlex(
    emoji: string,
    title: string,
    details: { label: string; value: string; color?: string }[],
    buttonLabel: string,
    buttonUri: string,
    headerBg: string = '#1e293b',
    headerColor: string = '#ffffff',
    buttonColor: string = '#3b82f6',
): FlexBubble {
    return {
        type: 'bubble',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: `${emoji} ${title}`,
                    weight: 'bold',
                    size: 'lg',
                    color: headerColor,
                },
            ],
            backgroundColor: headerBg,
            paddingAll: '16px',
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: details.map((d, i) => ({
                type: 'box' as const,
                layout: 'horizontal' as const,
                contents: [
                    { type: 'text' as const, text: d.label, size: 'sm' as const, color: '#94a3b8', flex: 2 },
                    { type: 'text' as const, text: d.value, size: 'sm' as const, color: d.color || '#f1f5f9', weight: 'bold' as const, flex: 3, align: 'end' as const },
                ],
                margin: i === 0 ? 'none' as const : 'sm' as const,
            })),
            paddingAll: '16px',
            backgroundColor: '#1e293b',
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'button',
                    action: {
                        type: 'uri',
                        label: buttonLabel,
                        uri: buttonUri,
                    },
                    style: 'primary',
                    color: buttonColor,
                },
            ],
            paddingAll: '12px',
            backgroundColor: '#1e293b',
        },
    };
}

// Send a text message to a user
export async function sendTextMessage(userId: string, text: string) {
    try {
        const message: TextMessage = { type: 'text', text };
        return await getClient().pushMessage(userId, message);
    } catch (err) {
        console.error('LINE push text error:', err);
    }
}

// Send Flex Message
export async function sendFlexMessage(userId: string, altText: string, contents: FlexBubble) {
    try {
        const message: FlexMessage = {
            type: 'flex',
            altText,
            contents,
        };
        return await getClient().pushMessage(userId, message);
    } catch (err) {
        console.error('LINE push flex error:', err);
    }
}

// ==========================================
// Order Notifications
// ==========================================

// Send order confirmation to user
export function buildOrderConfirmationFlex(
    orderNumber: string,
    lotteryName: string,
    totalAmount: number,
    status: string
): FlexBubble {
    return buildNotificationFlex(
        '🎰', 'ยืนยันออร์เดอร์',
        [
            { label: 'เลขที่', value: orderNumber },
            { label: 'ประเภท', value: lotteryName },
            { label: 'ยอดรวม', value: `฿${totalAmount.toLocaleString()}`, color: '#60a5fa' },
            { label: 'สถานะ', value: status, color: '#fbbf24' },
        ],
        'ดูรายละเอียด',
        `${APP_URL}/order/history`,
    );
}

// Notify admin about new order
export async function notifyAdminNewOrder(orderNumber: string, totalAmount: number, customerName: string) {
    const adminIds = (process.env.ADMIN_LINE_USER_IDS || '').split(',').filter(Boolean);

    const flex = buildNotificationFlex(
        '🔔', 'ออร์เดอร์ใหม่รอตรวจสอบ',
        [
            { label: 'เลขที่', value: orderNumber },
            { label: 'ลูกค้า', value: customerName },
            { label: 'ยอด', value: `฿${totalAmount.toLocaleString()}`, color: '#60a5fa' },
        ],
        'ตรวจสอบ',
        `${APP_URL}/admin/orders`,
        '#7c3aed',
        '#ffffff',
        '#7c3aed',
    );

    for (const adminId of adminIds) {
        await sendFlexMessage(adminId, `🔔 ออร์เดอร์ใหม่: ${orderNumber}`, flex);
    }
}

// Notify user: order approved
export async function notifyUserOrderApproved(userId: string, orderNumber: string, adminNote?: string) {
    const details = [
        { label: 'เลขที่', value: orderNumber },
        { label: 'สถานะ', value: '✅ อนุมัติแล้ว', color: '#34d399' },
    ];
    if (adminNote) {
        details.push({ label: 'หมายเหตุ', value: adminNote });
    }

    const flex = buildNotificationFlex(
        '✅', 'ออร์เดอร์อนุมัติแล้ว',
        details,
        'ดูออร์เดอร์',
        `${APP_URL}/order/history`,
        '#065f46',
        '#ffffff',
        '#10b981',
    );

    await sendFlexMessage(userId, `✅ ออร์เดอร์ ${orderNumber} อนุมัติแล้ว`, flex);
}

// Notify user: order rejected
export async function notifyUserOrderRejected(userId: string, orderNumber: string, reason?: string) {
    const details = [
        { label: 'เลขที่', value: orderNumber },
        { label: 'สถานะ', value: '❌ ถูกปฏิเสธ', color: '#f87171' },
    ];
    if (reason) {
        details.push({ label: 'เหตุผล', value: reason });
    }

    const flex = buildNotificationFlex(
        '❌', 'ออร์เดอร์ถูกปฏิเสธ',
        details,
        'ดูรายละเอียด',
        `${APP_URL}/order/history`,
        '#7f1d1d',
        '#ffffff',
        '#ef4444',
    );

    await sendFlexMessage(userId, `❌ ออร์เดอร์ ${orderNumber} ถูกปฏิเสธ`, flex);
}

// Notify user: ticket images sent (order completed)
export async function notifyUserTicketSent(userId: string, orderNumber: string) {
    const flex = buildNotificationFlex(
        '🎫', 'ส่งรูป Lottery แล้ว',
        [
            { label: 'เลขที่', value: orderNumber },
            { label: 'สถานะ', value: '🎫 ซื้อสำเร็จ', color: '#34d399' },
        ],
        'ดูรูป Lottery',
        `${APP_URL}/order/history`,
        '#1e3a5f',
        '#ffffff',
        '#3b82f6',
    );

    await sendFlexMessage(userId, `🎫 ส่งรูป Lottery สำหรับ ${orderNumber}`, flex);
}

// Notify user: prize transfer slip sent
export async function notifyUserPrizeTransferred(
    userId: string,
    orderNumber: string,
    amount: number,
    note?: string
) {
    const details = [
        { label: 'เลขที่', value: orderNumber },
        { label: 'จำนวนเงิน', value: `฿${amount.toLocaleString()}`, color: '#34d399' },
        { label: 'สถานะ', value: '💸 โอนเงินแล้ว', color: '#34d399' },
    ];
    if (note) {
        details.push({ label: 'หมายเหตุ', value: note });
    }

    const flex = buildNotificationFlex(
        '💸', 'โอนเงินรางวัลแล้ว',
        details,
        'ดูสลิปโอนเงิน',
        `${APP_URL}/my-results`,
        '#064e3b',
        '#ffffff',
        '#10b981',
    );

    await sendFlexMessage(userId, `💸 โอนเงินรางวัล ${orderNumber}`, flex);
}

// Notify user: you won a prize!
export async function notifyUserWonPrize(
    userId: string,
    lotteryName: string,
    prizeName: string,
    prizeAmount: number,
    drawDate: string
) {
    const flex = buildNotificationFlex(
        '🏆', 'ยินดีด้วย! คุณถูกรางวัล!',
        [
            { label: 'หวย', value: lotteryName },
            { label: 'งวด', value: drawDate },
            { label: 'รางวัล', value: prizeName, color: '#fbbf24' },
            { label: 'มูลค่า', value: `$${prizeAmount.toLocaleString()}`, color: '#34d399' },
        ],
        'ดูรายละเอียด',
        `${APP_URL}/my-results`,
        '#78350f',
        '#ffffff',
        '#f59e0b',
    );

    await sendFlexMessage(userId, `🏆 ยินดีด้วย! คุณถูกรางวัล ${prizeName}!`, flex);
}

// Legacy compatibility wrapper
export async function notifyUserOrderStatus(
    userId: string,
    orderNumber: string,
    status: 'approved' | 'rejected',
    adminNote?: string
) {
    if (status === 'approved') {
        await notifyUserOrderApproved(userId, orderNumber, adminNote);
    } else {
        await notifyUserOrderRejected(userId, orderNumber, adminNote);
    }
}
