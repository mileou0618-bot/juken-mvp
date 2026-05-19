"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SESSION_KEY = "jukenDiagnosisResult";
const WECHAT_ID = "Juken-family";

function buildCopyFallback(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.top = "-1000px";
  el.style.left = "-1000px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      buildCopyFallback(text);
      return true;
    } catch {
      return false;
    }
  }
}

export default function CnContactPage() {
  const [copiedId, setCopiedId] = useState<"" | "message">("");
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

  const handleCopyMessage = async () => {
    const lines: string[] = [`微信号：${WECHAT_ID}`];
    if (diagnosisId) lines.push(`诊断ID：${diagnosisId}`);
    const ok = await copyText(lines.join("\n"));
    if (!ok) return;
    setCopiedId("message");
    window.setTimeout(() => setCopiedId(""), 1200);
  };

  return (
    <main className="legal-page cn-page cn-contact">
      <h1 className="legal-title">根据诊断结果进一步整理家庭学习</h1>
      <p className="result-text" style={{ marginTop: 10 }}>
        很多问题不是孩子不努力，
        <br />
        而是家庭学习结构开始混乱。
      </p>

      <section className="legal-section cn-contact-card">
        <div className="cn-contact-qr">
          <Image src="/wechat-qr.jpg" alt="微信二维码" width={520} height={520} />
          <div className="cn-wechat-qr-note">扫码添加微信</div>
        </div>

        <div className="cn-contact-wechat-id">微信号：{WECHAT_ID}</div>

        <button type="button" className="cn-wechat-btn cn-wechat-btn-primary" onClick={handleCopyMessage}>
          {copiedId === "message" ? "已复制" : "复制咨询信息"}
        </button>

        <p className="legal-muted" style={{ marginTop: 12 }}>
          仅面向在日华人中学受験家庭。
        </p>
      </section>
    </main>
  );
}
