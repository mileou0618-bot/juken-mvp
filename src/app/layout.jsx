import "./globals.css";

export const metadata = {
  title: "metech-i / juken",
  description: "中学受験の保護者向け 学習管理診断",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

