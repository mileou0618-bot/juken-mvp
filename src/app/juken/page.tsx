"use client";

import Link from "next/link";

export default function JukenLandingPage() {
  return (
    <div className="lp-page">
      <header className="lp-header">
        <div className="lp-header-inner">
          <div>
            <div className="lp-brand">
              metech-i <span>/ juken</span>
            </div>
            <div className="lp-header-sub">中学受験の保護者向け 学習管理診断</div>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-inner">
            <div className="lp-hero-copy">
              <p className="lp-pill">中学受験の保護者向け</p>

              <h1>
                塾の宿題を「こなす」だけでなく、
                <br />
                成績につながる家庭学習に変える。
              </h1>

              <p className="lp-lead">
                塾の学習を家庭で無駄なく回すための、
                <br />
                保護者向け学習管理システム。
              </p>

              <Link href="/juken/diagnosis" className="lp-cta" style={{ display: "inline-block" }}>
                無料で診断する（約3分）
              </Link>

              <p className="lp-note">※個人情報の入力は最小限です</p>
            </div>

            <div className="lp-hero-visual" aria-hidden="true">
              <div className="visual-blob"></div>
              <div className="clipboard">
                <div className="clip"></div>
                {[0, 1, 2, 3].map((item) => (
                  <div className="check-row" key={item}>
                    <span>✓</span>
                    <i></i>
                  </div>
                ))}
              </div>
              <div className="magnifier"></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
