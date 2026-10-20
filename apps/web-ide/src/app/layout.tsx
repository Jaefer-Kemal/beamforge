import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BeamForge | Mastering Erlang/OTP & Distributed Systems",
  description:
    "Boot.dev-style interactive training platform for Erlang/OTP, distributed systems, raw TCP backends, and XMPP protocol engineering — with live BEAM bytecode verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full">
      {/* Inline script: apply theme-dark class before first paint to avoid flash */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bf_theme');if(t==='dark')document.documentElement.classList.add('theme-dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased h-full w-full overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
