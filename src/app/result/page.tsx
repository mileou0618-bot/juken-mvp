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
            <h1>診断データが確認できませんでした。</h1>
            <p>お手数ですが、もう一度最初から診断をお願いいたします。</p>
            <Link href="/diagnosis" className="cta light" style={{ display: "inline-block" }}>
              診断ページへ戻る
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
          <div className="result-pill">診断結果：{template.diagnosisLabel}</div>
          <div className="result-hero-grid">
            <div>
              <h1 className="result-h1">{template.heroTitle}</h1>
              <p className="result-hero-lead">{template.heroSummary}</p>
            </div>

            <section className="result-card result-card-soft" aria-label="家庭で見えやすいサイン">
              <p className="result-card-title">家庭で見えやすいサイン</p>
              <div className="result-example" style={{ marginTop: 10 }}>
                {template.currentSituation.slice(0, 3).map((item, index) => (
                  <p key={`${index}-${item}`} className={index === 0 ? undefined : "mt"}>
                    ・{item}
                  </p>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="result-section">
          <h2 className="result-h2">今、家庭で起きていること</h2>
          <div className="result-card">
            <p className="result-muted">
              「できない」から始まっているわけではありません。家庭学習の回し方が、今の量と難度に追いつきにくくなっています。
            </p>
            <div className="result-cause-list" style={{ marginTop: 12 }}>
              {template.currentSituation.map((item, index) => (
                <div key={`${index}-${item}`} className="result-cause-item">
                  <div className="result-badge">{index + 1}</div>
                  <p className="result-cause-text">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="result-section result-soft">
          <div className="result-card">
            <p className="result-card-title">このまま続くと、どうなりやすいか</p>
            <p className="result-muted">{template.riskMessage}</p>
          </div>
        </section>

        <section className="result-section result-soft">
          <h2 className="result-h2">
            今週、
            <br className="sp-only" />
            まず直すべき“回し方”です
          </h2>
          <div className="result-ca-grid">
            <div className="result-card">
              <p className="result-card-title">家庭で起きやすい状態</p>
              <div className="result-cause-list">
                {template.currentSituation.map((item, index) => (
                  <div key={`${index}-${item}`} className="result-cause-item">
                    <div className="result-badge">{index + 1}</div>
                    <p className="result-cause-text">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="result-card">
              <p className="result-card-title">今週まず変えること</p>
              <p className="result-muted" style={{ marginTop: 8 }}>
                {template.thisWeekAction}
              </p>
            </div>
          </div>
        </section>

        <section className="result-section result-soft">
          <div className="result-card">
            <p className="result-card-title">保護者の方へ</p>
            <p className="result-muted">{template.parentClosingMessage}</p>
          </div>
        </section>

        <section className="result-section">
          <div className="result-card result-center">
            <p className="result-card-kicker">次のステップ</p>
            <h2 className="result-h2">ご家庭に合った学習管理の進め方を相談する</h2>
            <p className="result-muted">診断結果をもとに、どこを直すべきかを具体的に整理します。</p>
            <div className="result-btn-row">
              <button
                type="button"
                className="result-btn result-btn-primary"
                onClick={() => alert("（MVP）LINE相談は後続実装です")}
              >
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
      </main>
    </div>
  );
}

