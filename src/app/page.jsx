import Link from "next/link";

export default function HomePage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://judanjapan.jp";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "中学受験 学習管理診断",
        url: new URL("/", siteUrl).toString(),
      },
      {
        "@type": "WebSite",
        name: "中学受験 学習管理診断",
        url: new URL("/", siteUrl).toString(),
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
              text: "いいえ。成績が上がることを保証するものではありません。家庭学習上の状態を整理するための診断です。",
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
              <p className="lp-pill">中学受験の保護者向け</p>

              <h1>
                塾の宿題を「こなす」だけでなく、
                <br className="sp-only" />
                成績につながる家庭学習に変える。
              </h1>

              <p className="lp-lead">
                塾の学習を家庭で無駄なく回すための、
                <br className="sp-only" />
                保護者向け学習管理システム。
              </p>

              <Link href="/diagnosis" className="lp-cta">
                無料診断をはじめる
              </Link>
            </div>

            <div className="lp-hero-visual" aria-hidden="true">
              <div className="lp-report-card">
                <div className="lp-report-kicker">家庭学習チェック</div>
                <div className="lp-report-title">今の状態を整理</div>
                <ul className="lp-report-list">
                  <li>宿題の回し方</li>
                  <li>復習のタイミング</li>
                  <li>親の声かけ</li>
                </ul>
                <div className="lp-report-note">診断後にタイプを表示</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
