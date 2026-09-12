import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FitOpe — train, eat, recover",
  description:
    "A personal fitness companion for training, Indian nutrition tracking, sleep, recovery and long-term body transformation.",
  appleWebApp: { capable: true, title: "FitOpe", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#eef1f5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Applies the saved theme before paint so there is no flash. */
const themeScript = `try{var t=localStorage.getItem("fitope-theme")||"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={geist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
