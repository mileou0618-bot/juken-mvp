"use client";

import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname() || "/";
  const isCn = pathname.startsWith("/cn");

  const contactHref = isCn ? "/cn/contact" : "/contact";
  const contactLabel = isCn ? "联系/咨询" : "お問い合わせ";

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">運営：JUDAN JAPAN</div>
        <div className="site-footer-desc">中学受験家庭向け学習整理サポート</div>
        <div className="site-footer-links">
          <a href="/privacy">プライバシーポリシー</a>
          <span className="site-footer-sep">・</span>
          <a href={contactHref}>{contactLabel}</a>
          <span className="site-footer-sep">・</span>
          <a href="/disclaimer">免責事項</a>
        </div>
      </div>
    </footer>
  );
}

