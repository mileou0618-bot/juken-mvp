"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SESSION_KEY = "jukenDiagnosisResult";
const WECHAT_ID = "Juken-family";

export default function CnContactPage() {
  const [diagnosisId, setDiagnosisId] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      const id = typeof parsed?.diagnosisId === "string" ? parsed.diagnosisId : "";
      setDiagnosisId(String(id || "").trim());
    } catch {
      setDiagnosisId("");
    }
  }, []);

  return (
    <main className="legal-page cn-page cn-contact">
      <h1 className="legal-title">根据诊断结果进一步整理家庭学习</h1>
      <p className="result-text" style={{ marginTop: 10 }}>
        很多问题不是孩子不努力，
        <br />
        而是家庭学习结构开始混乱。
      </p>

      <section className="legal-section cn-contact-card">
        <div className="cn-contact-qrWrap" aria-label="微信二维码">
          <div className="cn-contact-qr">
            <Image className="cn-contact-qrImg" src="/wechat-qr.jpg" alt="微信二维码" width={520} height={520} />
          </div>
          <div className="cn-wechat-qr-note">扫码添加微信</div>
        </div>

        <div className="cn-contact-wechat-id">微信号：{WECHAT_ID}</div>
        {diagnosisId ? <div className="cn-contact-diagnosis-id">诊断ID：{diagnosisId}</div> : null}

        <p className="legal-muted" style={{ marginTop: 12 }}>
          {diagnosisId ? "添加微信后，请发送诊断ID。" : "添加微信后，请说明你想咨询的家庭学习情况。"}
        </p>

        <p className="legal-muted" style={{ marginTop: 12 }}>
          仅面向在日华人中学受験家庭。
        </p>
      </section>
    </main>
  );
}
