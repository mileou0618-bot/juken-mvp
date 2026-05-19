"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { StoredDiagnosisResult } from "@/lib/juken/types";
import { JUKEN_DIAGNOSIS_DISCLAIMER } from "@/data/jukenResultTemplates";
import RiskRadarChart from "@/components/juken/RiskRadarChart";
import { getResultDisplay } from "@/lib/juken/resultDisplayMap";

const SESSION_KEY = "jukenDiagnosisResult";

function safeParse(json: string): StoredDiagnosisResult | null {
  try {
    return JSON.parse(json) as StoredDiagnosisResult;
  } catch {
    return null;
  }
}

function Multiline({ text }: { text: string }) {
  const parts = String(text).split("\n");
  return (
    <>
      {parts.map((part, idx) => (
        <span key={`${idx}-${part}`}>
          {part}
          {idx < parts.length - 1 ? <br /> : null}
        </span>
      ))}
    </>
  );
}

function ResponsiveTitle({ text, isMobile }: { text: string; isMobile: boolean }) {
  const value = String(text);
  if (isMobile) return <Multiline text={value} />;
  return <>{value.replace(/\n+/g, " ")}</>;
}

function Paragraphs({ lines }: { lines: string[] }) {
  const cleaned = (lines ?? []).map((l) => String(l).trim()).filter((l) => l.length > 0);
  const paragraphs: string[] = [];
  if (cleaned.length <= 2) {
    paragraphs.push(cleaned.join(" "));
  } else if (cleaned.length <= 4) {
    paragraphs.push(cleaned.slice(0, 2).join(" "));
    paragraphs.push(cleaned.slice(2).join(" "));
  } else {
    paragraphs.push(cleaned.slice(0, 2).join(" "));
    paragraphs.push(cleaned.slice(2, 4).join(" "));
    paragraphs.push(cleaned.slice(4).join(" "));
  }

  return (
    <div className="result-paragraphs">
      {paragraphs
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .slice(0, 3)
        .map((paragraph, idx) => (
          <p key={`${idx}-${paragraph}`} className="result-paragraph">
            {paragraph}
          </p>
        ))}
    </div>
  );
}

function ClampedParagraph({ lines }: { lines: string[] }) {
  const cleaned = (lines ?? []).map((l) => String(l).trim()).filter((l) => l.length > 0);
  const text = cleaned.join(" ").trim();
  return (
    <div className="result-paragraphs">
      <p className="result-paragraph result-clamp-3">{text}</p>
    </div>
  );
}

export default function JukenResultPage() {
  const [data, setData] = useState<StoredDiagnosisResult | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      setData(raw ? safeParse(raw) : null);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const riskModel = data?.riskModel ?? null;
  const display = useMemo(() => (riskModel ? getResultDisplay(String((riskModel as any).type ?? "")) : null), [riskModel]);

  useEffect(() => {
    if (!riskModel || !display) return;
    // Debug only (console): ensure result page uses the same map as API/mail.
    // eslint-disable-next-line no-console
    console.log("[juken][result] internalType:", (riskModel as any).type);
    // eslint-disable-next-line no-console
    console.log("[juken][result] title:", display.resultTitle);
    // eslint-disable-next-line no-console
    console.log("[juken][result] currentState:", display.currentState);
  }, [riskModel, display]);

  if (!data || !riskModel || !display) {
    return (
      <div className="form-page">
        <main className="done-page">
          <div className="done-card">
            <h1>診断結果を表示できませんでした。</h1>
            <p>お手数ですが、もう一度診断をお試しください。</p>
            <Link href="/juken/diagnosis" className="cta light" style={{ display: "inline-block" }}>
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
        {/* Module 1: Result title card */}
        <section className="result-module">
          <div className="result-kicker">診断結果</div>
          <h1 className="result-title">
            <ResponsiveTitle text={display.resultTitle as string} isMobile={isMobile} />
          </h1>
        </section>

        {/* Module 1.5: Risk balance (optional) */}
        {riskModel?.dimensionRisks ? (
          <section className="result-module">
            <h2 className="result-h2">今の家庭学習の偏り</h2>
            <div className="risk-balance">
              <RiskRadarChart dimensionRisks={riskModel.dimensionRisks} />

              <div className="risk-metrics" aria-label="各指標（1〜5）">
                {(
                  [
                    ["宿題負荷", riskModel.dimensionRisks.homework_load],
                    ["復習・定着不足", riskModel.dimensionRisks.review_retention],
                    ["計画・優先順位", riskModel.dimensionRisks.planning],
                    ["親の関与過多", riskModel.dimensionRisks.parent_involvement],
                    ["自走性不足", riskModel.dimensionRisks.autonomy],
                    ["精神的負荷", riskModel.dimensionRisks.mental_load],
                  ] as const
                ).map(([label, score]) => (
                  <div className="risk-metric" key={label}>
                    <span className="risk-metric-label">{label}</span>
                    <span className="risk-metric-score">{Number(score).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="risk-top">
              <div className="risk-top-title">特に強く出ている傾向</div>
              <div className="risk-top-tags">
                {riskModel.topRisks?.slice(0, 2).map((t) => {
                  const label =
                    t.dimension === "homework_load"
                      ? "宿題負荷"
                      : t.dimension === "review_retention"
                        ? "復習・定着不足"
                        : t.dimension === "planning"
                          ? "計画・優先順位"
                          : t.dimension === "parent_involvement"
                            ? "親の関与過多"
                            : t.dimension === "autonomy"
                              ? "自走性不足"
                              : "精神的負荷";
                  return (
                    <span className="risk-tag" key={`${t.dimension}-${label}`}>
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {/* Module 2: What’s happening */}
        <section className="result-module result-now">
          <div className="result-section-kicker">現在の整理</div>
          <h2 className="result-h2">いま起きていること</h2>
          <ClampedParagraph lines={(display.currentState ? display.currentState.split("\n") : []) as string[]} />
        </section>

        {/* Module 3: Risks */}
        <section className="result-module result-risk">
          <div className="result-section-kicker">このままの場合</div>
          <h2 className="result-h2">このまま続くと、起きやすいこと</h2>
          <ClampedParagraph lines={(display.futureRisk ? display.futureRisk.split("\n") : []) as string[]} />
        </section>

        {/* Module 4: LINE CTA */}
        <section className="result-module result-cta">
          <div className="result-section-kicker">次にできること</div>
          <h2 className="result-cta-title">家庭学習の進め方を整理してみませんか？</h2>
          <div className="result-cta-body">
            <p className="result-text">今の状況をもとに、どこから整えるべきか確認できます。</p>
          </div>
          <div className="result-btn-row">
            <a className="result-line-btn" href="https://lin.ee/pxHFmsI" target="_blank" rel="noopener noreferrer">
              LINEで相談する
            </a>
          </div>
        </section>

        <section className="result-disclaimer">
          <p className="result-disclaimer-text">{JUKEN_DIAGNOSIS_DISCLAIMER}</p>
        </section>
      </main>
    </div>
  );
}
