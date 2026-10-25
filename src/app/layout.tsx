import type { Metadata } from "next";
import { Poppins, Inter } from 'next/font/google'
import "./globals.css";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: "Gestão de Projetos | ArtBoard",
  description: "ArtBoard — Plataforma completa de gestão de projetos, timesheet e produtividade",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={poppins.variable + ' ' + inter.variable + ' h-full'}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
