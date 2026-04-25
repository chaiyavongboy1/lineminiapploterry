import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LineProvider } from "@/components/LineProvider";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Lottery USA | ฝากซื้อลอตเตอรี่ที่อเมริกา",
  description: "บริการรับฝากซื้อ Powerball, Mega Millions และ Lottery อเมริกาอื่นๆ ได้ง่ายๆ ผ่าน LINE",
  openGraph: {
    title: "Lottery USA | ฝากซื้อลอตเตอรี่ที่อเมริกา",
    description: "ฝากซื้อ Powerball, Mega Millions ผ่าน LINE ได้แล้ววันนี้!",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f4f8ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <LineProvider>
          <div className="container page-content">
            {children}
          </div>
          <BottomNav />
        </LineProvider>
      </body>
    </html>
  );
}
