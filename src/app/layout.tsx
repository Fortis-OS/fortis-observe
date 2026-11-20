import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Frost's type: Rufscript for words, JetBrains Mono for numbers and data.
const rufscript = localFont({
  src: "./fonts/Rufscript.ttf",
  variable: "--font-rufscript",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fortis Observe",
  description: "Real-time SOC/NOC Observability Platform",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${rufscript.variable} ${jetbrains.variable}`}>
      <body suppressHydrationWarning className="font-sans text-fg flex min-h-screen overflow-hidden">
        <div className="frost-backdrop" aria-hidden />
        <Sidebar />
        <main className="flex-1 h-screen overflow-y-auto relative pb-24 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
