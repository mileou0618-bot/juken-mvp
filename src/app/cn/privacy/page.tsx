export default function CnPrivacyPage() {
  return (
    <main className="legal-page cn-page">
      <h1 className="legal-title">隐私政策</h1>

      <section className="legal-section">
        <h2>获取的信息</h2>
        <p>
          我们可能会收集以下信息：
          <br />
          ・邮箱地址
          <br />
          ・孩子年级
          <br />
          ・诊断回答内容
          <br />
          ・家长主动填写的信息
        </p>
        <p style={{ marginTop: 12 }}>
          这些信息仅用于：
          <br />
          ・显示诊断结果
          <br />
          ・发送诊断邮件
          <br />
          ・后续学习整理沟通
        </p>
      </section>

      <section className="legal-section">
        <h2>信息保存与管理</h2>
        <p>
          我们不会公开个人信息，也不会向第三方出售数据。
          <br />
          所有信息仅用于当前服务的运营与沟通。
        </p>
      </section>

      <section className="legal-section">
        <h2>关于诊断内容</h2>
        <p>
          本诊断仅用于家庭学习结构整理参考。
          <br />
          不构成教育、医疗、心理等专业判断。
        </p>
      </section>

      <section className="legal-section">
        <h2>联系方式</h2>
        <p>如对隐私政策有疑问，请通过“联系咨询”页面联系。</p>
      </section>
    </main>
  );
}

