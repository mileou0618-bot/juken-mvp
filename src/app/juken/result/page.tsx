"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { StoredDiagnosisResult } from "@/lib/juken/types";
import { JUKEN_RESULT_TEMPLATES, JUKEN_DIAGNOSIS_DISCLAIMER } from "@/data/jukenResultTemplates";

const SESSION_KEY = "jukenDiagnosisResult";

function safeParse(json: string): StoredDiagnosisResult | null {
  try {
    return JSON.parse(json) as StoredDiagnosisResult;
  } catch {
    return null;
  }
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "chart") {
    return (
      <svg {...commonProps}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-9" />
      </svg>
    );
  }
  if (name === "target") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v18" />
      </svg>
    );
  }
  if (name === "check-square") {
    return (
      <svg {...commonProps}>
        <rect width="16" height="16" x="4" y="4" rx="2" />
        <path d="m8 12 3 3 5-7" />
      </svg>
    );
  }
  if (name === "mail") {
    return (
      <svg {...commonProps}>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </svg>
    );
  }
  return null;
}

export default function JukenResultPage() {
  const [data, setData] = useState<StoredDiagnosisResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    setData(raw ? safeParse(raw) : null);
  }, []);

  const template = useMemo(() => {
    if (!data) return null;
    return JUKEN_RESULT_TEMPLATES[data.diagnosisType];
  }, [data]);

  if (!data || !template) {
    return (
      <div className="form-page">
        <main className="done-page">
          <div className="done-card">
            <h1>診断結果が見つかりません</h1>
            <p>もう一度診断を行ってください。</p>
            <Link href="/juken/diagnosis" className="cta light" style={{ display: "inline-block" }}>
              診断をはじめる
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="result-page">
      <main className="result-main">
        <section className="result-hero">
          <div className="result-pill">診断結果</div>
          <div className="result-hero-grid">
            <div>
              <h1 className="result-h1">
                あなたのご家庭は
                <br />
                <span className="result-blue">「{template.diagnosisLabel}」</span>
                <br />
                です
              </h1>

              <p className="result-hero-lead">{template.problemSummary}</p>
            </div>

            <section className="result-card result-card-soft" aria-label="現在の学習傾向">
              <p className="result-card-title">現在の学習傾向</p>
              <div className="result-status-grid">
                <div className="result-status">
                  <p className="result-status-label">宿題完了</p>
                  <p className="result-status-value">{template.currentTrend.homework}</p>
                </div>
                <div className="result-status">
                  <p className="result-status-label">理解確認</p>
                  <p className="result-status-value result-blue">{template.currentTrend.understanding}</p>
                </div>
                <div className="result-status">
                  <p className="result-status-label">改善の優先度</p>
                  <p className="result-status-value">{template.currentTrend.priority}</p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="result-section result-soft">
          <div className="result-card">
            <p className="result-card-title">注意</p>
            <p className="result-muted">{template.visibleMessage}</p>
          </div>
        </section>

        <section className="result-section">
          <h2 className="result-h2">この診断でわかること</h2>
          <div className="result-know-grid">
            {[
              ["chart", "現在の状態", "どこで止まっているか"],
              ["target", "ズレの原因", "何がズレているか"],
              ["check-square", "今週やること", "何を直すか"],
            ].map(([icon, title, text]) => (
              <div className="result-card" key={title}>
                <div className="result-know-row">
                  <div className="result-know-icon">
                    <Icon name={icon} className="result-icon" />
                  </div>
                  <div>
                    <p className="result-know-title">{title}</p>
                    <p className="result-know-text">{text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="result-section result-soft">
          <h2 className="result-h2">
            問題は「宿題量」ではなく、
            <br className="sp-only" />
            家庭での回し方です
          </h2>
          <div className="result-ca-grid">
            <div className="result-card">
              <p className="result-card-title">原因</p>
              <div className="result-cause-list">
                {template.causes.map((cause, index) => (
                  <div key={cause} className="result-cause-item">
                    <div className="result-badge">{index + 1}</div>
                    <p className="result-cause-text">{cause}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="result-card">
              <p className="result-card-title">今週やること</p>
              <div className="result-actions">
                {template.thisWeekActions.map((action, index) => (
                  <div key={`${index}-${action}`} className="result-action">
                    <p className="result-action-title">{index + 1}. {action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="result-section result-soft">
          <div className="result-card">
            <p className="result-card-title">見直しの例</p>
            <p className="result-muted">同じような状態のご家庭では、まず学習の回し方を整理することから始めます。</p>
            <div className="result-example">
              <p>・宿題を終わらせるだけでなく、理解確認を入れる</p>
              <p className="mt">・復習や直しのタイミングを固定する</p>
              <p className="mt">・親の声かけを「量」から「確認」に変える</p>
            </div>
          </div>
        </section>

        <section className="result-section">
          <div className="result-card result-center">
            <p className="result-card-kicker">次のステップ</p>
            <h2 className="result-h2">ご家庭に合った学習管理の進め方を相談する</h2>
            <p className="result-muted">診断結果をもとに、どこを直すべきかを具体的に整理します。</p>
            <div className="result-btn-row">
              <button type="button" className="result-btn result-btn-primary" onClick={() => alert("（MVP）LINE相談は後続実装です")}>
                LINEで学習状況を相談する
              </button>
            </div>
            <p className="result-note">無理な勧誘はありません。現在の状況を整理するための相談です。</p>
          </div>

          <div className="result-mail-note">
            <Icon name="mail" className="result-icon" />
            <p>※診断結果の詳細はメールでもお送りしています。</p>
          </div>
        </section>

        <section className="result-section result-soft">
          <div className="result-card">
            <p className="result-card-title">免責</p>
            <p className="result-muted">{JUKEN_DIAGNOSIS_DISCLAIMER}</p>
          </div>
        </section>

        <div className="result-footer">
          <Link href="/juken/diagnosis" className="result-back">
            もう一度診断する
          </Link>
        </div>
      </main>
    </div>
  );
}
