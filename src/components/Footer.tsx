"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname() || "/";
  const isCn = pathname.startsWith("/cn");

  const contactHref = isCn ? "/cn/contact" : "/contact";

  const brand = isCn ? "运营：JUDAN JAPAN" : "運営：JUDAN JAPAN";
  const desc = isCn ? "在日华人中学受験家庭学习整理支持" : "中学受験家庭向け学習整理サポート";

  const privacyHref = isCn ? "/cn/privacy" : "/privacy";
  const disclaimerHref = isCn ? "/cn/disclaimer" : "/disclaimer";

  const privacyLabel = isCn ? "隐私政策" : "プライバシーポリシー";
  const contactLabel = isCn ? "联系咨询" : "お問い合わせ";
  const disclaimerLabel = isCn ? "免责声明" : "免責事項";

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">{brand}</div>
        <div className="site-footer-desc">{desc}</div>
        <div className="site-footer-links">
          <a href={privacyHref}>{privacyLabel}</a>
          <span className="site-footer-sep">・</span>
          <a href={contactHref}>{contactLabel}</a>
          <span className="site-footer-sep">・</span>
          <a href={disclaimerHref}>{disclaimerLabel}</a>
        </div>
      </div>
    </footer>
  );
}
