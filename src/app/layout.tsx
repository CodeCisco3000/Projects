import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { identity } from "@/content/site";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: `${identity.name} — ${identity.title}`,
  description: `${identity.name}: ${identity.title} student at City Tech, Brooklyn. ${identity.tagline}.`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
