"use client";

import { useState } from "react";
import Image from "next/image";

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
  const [copiedId, setCopiedId] = useState<"" | "wechat">("");

  const wechatUrl = process.env.NEXT_PUBLIC_WECHAT_URL || "weixin://";

  const handleCopyWechat = async () => {
    const ok = await copyText(WECHAT_ID);
    if (!ok) return;
    setCopiedId("wechat");
    window.setTimeout(() => setCopiedId(""), 1200);
  };

  return (
    <main className="legal-page cn-page">
      <h1 className="legal-title">可以根据诊断结果进一步咨询</h1>
      <section className="legal-section">
        <p>
          中学受験的家庭学习中，
          <br />
          很多问题不是孩子不努力，
          <br />
          而是作业、复习、订正、考试准备之间的优先级开始混乱。
          <br />
          如果你希望根据诊断结果进一步整理现状，可以通过微信联系。
        </p>

        <div style={{ marginTop: 18 }}>
          <div className="cn-wechat-row">
            <div style={{ fontWeight: 700 }}>微信号：{WECHAT_ID}</div>
            <button type="button" className="cn-wechat-btn" onClick={handleCopyWechat}>
              {copiedId === "wechat" ? "已复制" : "复制微信号"}
            </button>
            <a className="cn-wechat-btn cn-wechat-btn-primary" href={wechatUrl} target="_blank" rel="noopener noreferrer">
              打开微信
            </a>
          </div>
          <p style={{ marginTop: 10 }} className="legal-muted">
            添加微信时，请发送诊断ID，方便确认你的诊断结果。
            <br />
            诊断ID 可在结果页和邮件中查看。
          </p>
          <div className="cn-wechat-qr">
            <Image src="/wechat-qr.jpg" alt="微信二维码（Juken-family）" width={520} height={520} />
            <div className="cn-wechat-qr-note">扫码添加微信</div>
          </div>
        </div>

        <p style={{ marginTop: 14 }} className="legal-muted">
          如需使用 LINE，也可以从日文页面进入。
        </p>
      </section>
    </main>
  );
}
