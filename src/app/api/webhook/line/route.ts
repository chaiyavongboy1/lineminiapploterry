import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// POST /api/webhook/line — LINE Webhook handler
export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-line-signature');

        // Verify webhook signature
        const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
        if (channelSecret && signature) {
            const hash = crypto
                .createHmac('SHA256', channelSecret)
                .update(body)
                .digest('base64');

            if (hash !== signature) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
            }
        }

        const parsed = JSON.parse(body);
        const events = parsed.events || [];

        for (const event of events) {
            if (event.type === 'message' && event.message?.type === 'text') {
                await handleTextMessage(event);
            } else if (event.type === 'follow') {
                await handleFollowEvent(event);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Webhook error:', err);
        return NextResponse.json({ success: true }); // Always return 200 to LINE
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTextMessage(event: any) {
    const text = event.message.text.toLowerCase().trim();
    const userId = event.source.userId;
    const replyToken = event.replyToken;

    // Keywords that trigger Mini App link
    const buyKeywords = ['ฝากซื้อ', 'ซื้อ', 'lottery', 'powerball', 'mega', 'ฝากซื้อ lottery', 'buy'];

    if (buyKeywords.some(kw => text.includes(kw))) {
        await replyWithLotteryMenu(replyToken);
    } else if (text.includes('ประวัติ') || text.includes('history') || text.includes('ออร์เดอร์')) {
        await replyWithOrderHistory(replyToken, userId);
    } else {
        await replyWithWelcome(replyToken);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleFollowEvent(event: any) {
    await replyWithWelcome(event.replyToken);
}

async function replyWithLotteryMenu(replyToken: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const miniAppId = process.env.NEXT_PUBLIC_LINE_MINI_APP_ID || '';
    const miniAppUrl = `https://miniapp.line.me/${miniAppId}`;

    const flexMessage = {
        type: 'flex',
        altText: '🎰 เลือก Lottery ที่ต้องการ',
        contents: {
            type: 'bubble',
            hero: {
                type: 'image',
                url: `${appUrl}/images/lottery-banner.png`,
                size: 'full',
                aspectRatio: '20:13',
                aspectMode: 'cover',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '🎰 America Lottery',
                        weight: 'bold',
                        size: 'xl',
                        color: '#1a237e',
                    },
                    {
                        type: 'text',
                        text: 'ฝากซื้อ Lottery อเมริกาได้ง่ายๆ ผ่าน LINE!',
                        size: 'sm',
                        color: '#666666',
                        margin: 'md',
                        wrap: true,
                    },
                ],
                paddingAll: '20px',
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '🎯 ฝากซื้อ Lottery เลย!',
                            uri: miniAppUrl || appUrl,
                        },
                        style: 'primary',
                        color: '#1a237e',
                        height: 'md',
                    },
                ],
                paddingAll: '12px',
            },
        },
    };

    await callReplyAPI(replyToken, [flexMessage]);
}

async function replyWithOrderHistory(replyToken: string, _userId: string) {
    const miniAppId = process.env.NEXT_PUBLIC_LINE_MINI_APP_ID || '';
    const miniAppUrl = `https://miniapp.line.me/${miniAppId}/order/history`;

    await callReplyAPI(replyToken, [
        {
            type: 'flex',
            altText: '📋 ดูประวัติออร์เดอร์',
            contents: {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '📋 ประวัติออร์เดอร์', weight: 'bold', size: 'lg' },
                        { type: 'text', text: 'กดปุ่มด้านล่างเพื่อดูประวัติการฝากซื้อ', size: 'sm', color: '#666', margin: 'md', wrap: true },
                    ],
                    paddingAll: '16px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: { type: 'uri', label: 'ดูประวัติออร์เดอร์', uri: miniAppUrl },
                            style: 'primary',
                            color: '#1a237e',
                        },
                    ],
                    paddingAll: '12px',
                },
            },
        },
    ]);
}

async function replyWithWelcome(replyToken: string) {
    await callReplyAPI(replyToken, [
        {
            type: 'text',
            text:
                '🎰 ยินดีต้อนรับสู่ America Lottery!\n\n' +
                '📌 พิมพ์ "ฝากซื้อ" เพื่อดูรายการ Lottery\n' +
                '📋 พิมพ์ "ประวัติ" เพื่อดูออร์เดอร์\n\n' +
                'หรือกดเมนูด้านล่างได้เลยครับ 👇',
        },
    ]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callReplyAPI(replyToken: string, messages: any[]) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN not set');
        return;
    }

    await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ replyToken, messages }),
    });
}
