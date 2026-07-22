import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NoahWave · Cypher Archive",
  description:
    "Generative art archive — cypherpunk transmissions, ecstatic signal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-black font-mono text-[#00ff41]">
        {children}
      </body>
    </html>
  );
}
