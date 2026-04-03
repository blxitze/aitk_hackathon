import type { Metadata } from "next";
import { IBM_Plex_Mono, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "Smart City Almaty",
  description:
    "Панель управления с ИИ для городского управления: Алматы, Казахстан",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      data-theme="dark"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${ibmPlexMono.variable} ${spaceGrotesk.className} bg-[var(--bg-page)]`}
    >
      <body className="min-h-screen bg-[var(--bg-page)] antialiased text-[var(--text-primary)] transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
