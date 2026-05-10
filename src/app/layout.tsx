import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import "./globals.css";

// Design system v2 — DM Sans for body & UI, Instrument Serif (italic axis)
// for the wordmark and headings, JetBrains Mono for eyebrow / labels /
// price numerals. The CSS variable names align with Tailwind v4's @theme
// inline binding in globals.css.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Le Nouette · Preorder cemilan",
  description: "Preorder cemilan kantor setiap minggu",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const lang = pathname.startsWith("/admin") ? "en" : "id";
  return (
    <html
      lang={lang}
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
