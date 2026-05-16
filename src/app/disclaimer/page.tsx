export default function DisclaimerPage() {
  return (
    <main className="legal-page">
      <h1 className="legal-title">免責事項</h1>

      <section className="legal-section">
        <p>
          本診断は、家庭学習の状態を整理するための簡易チェックです。
          <br />
          学力・成績・合格可能性を保証するものではありません。
        </p>
      </section>

      <section className="legal-section">
        <p>
          本サービスの利用により生じた損害について、当社は一切の責任を負いません（法令により免責が認められない場合を除く）。
        </p>
      </section>

      <section className="legal-section">
        <p>
          本診断は医学的・心理的診断を目的としたものではありません。
          <br />
          ご不安がある場合は、専門機関へご相談ください。
        </p>
      </section>
    </main>
  );
}

