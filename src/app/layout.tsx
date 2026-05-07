import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
