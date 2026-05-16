import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://judanjapan.jp";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  title: "塾の宿題を「こなすだけ」で終わらせない家庭学習診断｜JUDAN JAPAN",
  description:
    "中学受験に向けて、塾の宿題・復習・親の関わり方・学習負荷を整理する保護者向けの無料チェックです。家庭学習が成績につながる形で回っているかを確認できます。",
  alternates: { canonical: new URL("/juken/diagnosis", siteUrl).toString() },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
