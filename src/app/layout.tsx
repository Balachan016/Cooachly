import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { manifestPath, PWA_THEME } from "@/lib/pwa";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cooachly — Coaching, scheduled simply",
  description:
    "Cooachly connects students with professors for scheduled 1:1 coaching sessions, messaging, and payments — across any timezone.",
  applicationName: "Cooachly",
  manifest: manifestPath("COOACHLY"),
  appleWebApp: { capable: true, title: PWA_THEME.COOACHLY.shortName, statusBarStyle: "default" },
  icons: { apple: "/icons/cooachly-apple-180.png" },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME.COOACHLY.themeColor,
  // Lets the installed app draw under the iPhone notch/home indicator; the
  // body pads itself back in with env(safe-area-inset-*) (see globals.css).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
