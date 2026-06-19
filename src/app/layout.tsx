import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";

// Applies the saved theme before first paint to avoid a dark→light flash.
const NO_FOUC = `(function(){try{var t=localStorage.getItem('topgolf:theme')||'dark';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('light',!d);}catch(e){}})();`;

export const metadata: Metadata = {
  title: "TOPgolf · Practice Analytics",
  description:
    "Import Garmin Approach R10 range data and track your game from 105 to 85.",
  applicationName: "TOPgolf",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TOPgolf",
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC }} />
      </head>
      <body className="font-sans text-ink antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
