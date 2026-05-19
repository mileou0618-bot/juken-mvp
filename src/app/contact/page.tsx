export default function ContactPage() {
  return (
    <main className="legal-page">
      <h1 className="legal-title">診断結果について相談できます</h1>
      <section className="legal-section">
        <p>
          家庭学習では、
          <br />
          「どこを優先すべきか」「どこまで親が見るべきか」を家庭だけで判断しにくいことがあります。
          <br />
          診断結果をもとに、今の状況を整理したい場合は、LINEからご相談ください。
        </p>
        <div style={{ marginTop: 18 }}>
          <a className="lp-cta" href="https://lin.ee/pxHFmsI" target="_blank" rel="noopener noreferrer">
            LINEで相談する
          </a>
        </div>
        <p style={{ marginTop: 14 }} className="legal-muted">
          診断IDをお送りいただけると、結果を確認したうえで状況を整理しやすくなります。
        </p>
        <p style={{ marginTop: 10 }} className="legal-muted">
          メールでのお問い合わせは準備中です。
        </p>
      </section>
    </main>
  );
}
