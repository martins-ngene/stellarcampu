import type { Metadata } from "next";
import { Manrope, Geist_Mono, Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import "./portal.css";
import "./themes.css";
import "./welcome.css";
import "./dashboard.css";
import "./auth-design.css";
import { LiveAuthProvider } from "@/components/auth/provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StellarCampus — Learn Stellar by building on Stellar",
  description:
    "Connect your wallet, build real transactions, and prove your skills through practical challenges on the Stellar Testnet.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${manrope.variable} ${geistMono.variable} ${inter.variable} ${dmSans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <LiveAuthProvider>{children}</LiveAuthProvider>
      </body>
    </html>
  );
}
