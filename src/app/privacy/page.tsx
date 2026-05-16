export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <h1 className="legal-title">プライバシーポリシー</h1>

      <section className="legal-section">
        <h2>取得する情報</h2>
        <p>本サービスでは、診断の実施にあたり以下の情報を取得します。</p>
        <ul>
          <li>保護者のお名前</li>
          <li>メールアドレス</li>
          <li>お子さまの学年</li>
          <li>通っている塾（任意）</li>
          <li>診断への回答内容</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>利用目的</h2>
        <p>取得した情報は、診断結果の表示・保存・メール送付、およびサービス改善のために利用します。</p>
      </section>

      <section className="legal-section">
        <h2>第三者提供</h2>
        <p>法令に基づく場合を除き、本人の同意なく第三者に提供しません。</p>
      </section>

      <section className="legal-section">
        <h2>お問い合わせ</h2>
        <p>本ポリシーに関するお問い合わせは「お問い合わせ」ページよりご連絡ください。</p>
      </section>
    </main>
  );
}

