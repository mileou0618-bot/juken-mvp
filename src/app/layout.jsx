import "./globals.css";
import SiteFooter from "@/components/SiteFooter";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://judanjapan.jp";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "中学受験 学習管理診断｜塾の宿題を成績につなげる家庭学習チェック",
    template: "%s｜中学受験 学習管理診断",
  },
  description:
    "塾の宿題をこなすだけで終わっていないかを確認し、家庭学習の管理状態・復習の遅れ・親の関わり方を整理する保護者向け無料診断です。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "中学受験 学習管理診断｜塾の宿題を成績につなげる家庭学習チェック",
    description:
      "塾の宿題をこなすだけで終わっていないかを確認し、家庭学習の管理状態・復習の遅れ・親の関わり方を整理する保護者向け無料診断です。",
    type: "website",
    url: "/",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "中学受験 学習管理診断" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "中学受験 学習管理診断｜塾の宿題を成績につなげる家庭学習チェック",
    description:
      "塾の宿題をこなすだけで終わっていないかを確認し、家庭学習の管理状態・復習の遅れ・親の関わり方を整理する保護者向け無料診断です。",
    images: ["/og.svg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
