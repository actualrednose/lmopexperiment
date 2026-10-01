import type { Metadata, Viewport } from "next";
import { Barlow, Lora, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Goblin Arrows — A Lost Mine of Phandelver Adaptation",
  description:
    "A turn-based tactical RPG adapting the opening act of Lost Mine of Phandelver: the wagon escort from Neverwinter, the goblin ambush on the Triboar Trail, and the rescue of Sildar Hallwinter from Cragmaw Hideout.",
  keywords: [
    "Goblin Arrows",
    "Lost Mine of Phandelver",
    "tactical RPG",
    "turn-based",
    "d20",
    "Next.js",
  ],
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1A2330",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${barlow.variable} ${lora.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
