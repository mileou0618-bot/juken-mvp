import Link from "next/link";

export default function JukenLandingPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://judanjapan.jp";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "中学受験 学習管理診断",
        url: new URL("/juken", siteUrl).toString(),
      },
      {
        "@type": "WebSite",
        name: "中学受験 学習管理診断",
        url: new URL("/juken", siteUrl).toString(),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "この診断は無料ですか？",
            acceptedAnswer: { "@type": "Answer", text: "はい、無料で利用できます。" },
          },
          {
            "@type": "Question",
            name: "塾を変えるための診断ですか？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "いいえ。塾を変える前に、家庭学習の回し方を整理するための診断です。",
            },
          },
          {
            "@type": "Question",
            name: "成績が上がることを保証しますか？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "いいえ。成績保証ではありません。家庭学習上の課題を整理するための診断です。",
            },
          },
          {
            "@type": "Question",
            name: "どのような家庭に向いていますか？",
            acceptedAnswer: {
              "@type": "Answer",
              text: "塾の宿題はこなしているのに成績につながりにくい、復習が遅れがち、親の関わり方に迷っている家庭に向いています。",
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="lp-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className="lp-hero">
          <div className="lp-hero-inner">
            <div className="lp-hero-copy">
              <p className="lp-pill">中学受験のご家庭向け</p>

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

              <p className="lp-note" style={{ marginTop: 12 }}>
                中学受験の家庭学習で起こりやすい「復習の遅れ」「優先順位の迷い」「声かけの難しさ」を、無料診断で整理します。
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
