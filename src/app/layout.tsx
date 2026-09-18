import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FitOpe — train, eat, recover",
  description:
    "A personal fitness companion for training, Indian nutrition tracking, sleep, recovery and long-term body transformation.",
  applicationName: "FitOpe",
  appleWebApp: { capable: true, title: "FitOpe", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f5" },
    { media: "(prefers-color-scheme: dark)", color: "#080a09" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /* The default (`resizes-visual`) lets the on-screen keyboard overlay the page,
     which hides the Save button of every bottom sheet. Resizing the content box
     instead keeps the sheet — and its `92dvh` cap — above the keyboard. */
  interactiveWidget: "resizes-content",
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
