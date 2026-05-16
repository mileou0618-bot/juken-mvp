export default function ContactPage() {
  return (
    <main className="legal-page">
      <h1 className="legal-title">お問い合わせ</h1>
      <section className="legal-section">
        <p>
          お問い合わせは、LINE またはメールにて承ります。
          <br />
          内容によっては回答までお時間をいただく場合があります。
        </p>
        <ul>
          <li>LINE：結果ページの「LINEで相談する」からご連絡ください。</li>
          <li>メール：<span className="legal-muted">（準備中）</span></li>
        </ul>
      </section>
    </main>
  );
}

