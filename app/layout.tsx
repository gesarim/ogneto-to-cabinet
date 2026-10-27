import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Огнето — кабинет КП",
  description: "Расчёт ТО огнетушителей и управление коммерческими предложениями",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
