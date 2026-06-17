"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { DimensionRisks, StoredDiagnosisResult } from "@/lib/juken/types";
import { CN_DIMENSION_LABELS, CN_RESULT_TEMPLATES } from "@/data/cnResultTemplates";
import RiskRadarChart from "@/components/juken/RiskRadarChart";

const SESSION_KEY = "jukenDiagnosisResult";
const WECHAT_ID = "Juken-family";

function safeParse(json: string): StoredDiagnosisResult | null {
  try {
    return JSON.parse(json) as StoredDiagnosisResult;
  } catch {
    return null;
  }
}

export default function CnResultPage() {
  const [data, setData] = useState<(StoredDiagnosisResult & { language?: "ja" | "cn" }) | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      setData(raw ? (safeParse(raw) as any) : null);
    } catch {
      setData(null);
    }
  }, []);

  const riskModel = data?.riskModel ?? null;
  const diagnosisId = (data && typeof (data as any).diagnosisId === "string" ? String((data as any).diagnosisId) : "").trim();
  const type = (riskModel && typeof (riskModel as any).type === "string" ? String((riskModel as any).type) : "") as keyof typeof CN_RESULT_TEMPLATES;

  const template = useMemo(() => {
    if (!type || !(type in CN_RESULT_TEMPLATES)) return null;
    return CN_RESULT_TEMPLATES[type];
  }, [type]);

  const topRisks = (Array.isArray((riskModel as any)?.topRisks) ? ((riskModel as any).topRisks as any[]) : []).slice(0, 2) as Array<{
    dimension?: string;
    label?: string;
    score?: number;
  }>;

  const dimensionRisks = useMemo(() => {
    const dr = (riskModel as any)?.dimensionRisks;
    if (!dr || typeof dr !== "object") return null;
    const keys = ["homework_load", "review_retention", "planning", "parent_involvement", "autonomy", "mental_load"] as const;
    for (const k of keys) {
      const v = Number(dr[k]);
      if (!Number.isFinite(v)) return null;
    }
    return dr as DimensionRisks;
  }, [riskModel]);

  const topRiskNarrative = useMemo(() => {
    const dims = topRisks.map((r) => r.dimension).filter((d): d is string => typeof d === "string");
    const parts: string[] = [];

    const has = (d: string) => dims.includes(d);

    if (has("parent_involvement")) {
      parts.push(
        "现在的状态可能已经变成：家长不提醒，学习就很难启动。短期看还能维持进度，但时间越久，家长会越来越累。"
      );
    }
    if (has("autonomy")) {
      parts.push(
        "孩子并不是完全不想学，更可能是：不知道下一步该先做什么，也还没有形成自己整理错题和复习顺序的习惯。"
      );
    }
    if (has("review_retention")) {
      parts.push(
        "作业看起来完成了，但错题、理解整理和复习回转没有跟上。这会导致：平时很忙，考试时还是反复错。"
      );
    }
    if (has("planning")) {
      parts.push(
        "现在最容易乱的不是学习时间，而是学习顺序。每天都在做事，但真正该先处理的内容容易被拖到后面。"
      );
    }
    if (has("homework_load")) {
      parts.push(
        "作业量已经开始占掉大部分家庭学习时间。如果继续只追完成量，复习和订正会越来越难插进去。"
      );
    }
    if (has("mental_load")) {
      parts.push(
        "学习本身之外，家庭里的紧张感和疲惫感也已经开始影响节奏。这时继续加压，效果通常不会更好。"
      );
    }

    return parts.slice(0, 2);
  }, [topRisks]);

  if (!data || !riskModel || !template) {
    return (
      <div className="form-page">
        <main className="done-page">
          <div className="done-card">
            <h1>无法读取诊断结果。</h1>
            <p>请返回诊断页重新填写。</p>
            <Link href="/cn/diagnosis" className="cta light" style={{ display: "inline-block" }}>
              返回诊断页
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const radarLabels = {
    homework_load: "宿题负荷",
    review_retention: "复习・定着不足",
    planning: "计划・优先顺位",
    parent_involvement: "家长介入过多",
    autonomy: "自主性不足",
    mental_load: "精神负荷",
  } as const;

  return (
    <div className="result-page cn-page cn-result">
      <main className="result-main">
        <section className="result-module">
          <div className="result-kicker">诊断结果</div>
          <h1 className="result-title">不是孩子不努力，<br />而是家庭学习结构开始失衡了。</h1>
          <p className="result-text" style={{ marginTop: 14 }}>
            每天都在学，但作业、复习、订正和考试准备之间，已经开始互相挤压。
          </p>
        </section>

        <section className="result-module">
          <h2 className="result-h2">当前家庭学习倾向</h2>
          <p className="result-text cn-clamp-3" style={{ marginTop: 10 }}>
            {template.title}
          </p>
          <div className="risk-balance">
            {dimensionRisks ? (
              <RiskRadarChart dimensionRisks={dimensionRisks} labels={radarLabels} ariaLabel="家庭学习倾向（6项）" />
            ) : (
              <div className="result-text" style={{ marginTop: 6 }}>
                （风险图暂时无法显示）
              </div>
            )}

            <div className="risk-metrics" aria-label="各维度分数（1〜5）">
              {(
                [
                  ["宿题负荷", dimensionRisks?.homework_load],
                  ["复习・定着不足", dimensionRisks?.review_retention],
                  ["计划・优先顺位", dimensionRisks?.planning],
                  ["家长介入过多", dimensionRisks?.parent_involvement],
                  ["自主性不足", dimensionRisks?.autonomy],
                  ["精神负荷", dimensionRisks?.mental_load],
                ] as const
              ).map(([label, score]) => (
                <div className="risk-metric" key={label}>
                  <span className="risk-metric-label">{label}</span>
                  <span className="risk-metric-score">{Number(score ?? 0).toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="risk-top">
            <div className="risk-top-title">当前最明显的倾向</div>
            <div className="risk-top-tags">
              {topRisks.length ? (
                topRisks.map((r) => {
                  const dim = r.dimension as keyof typeof CN_DIMENSION_LABELS;
                  const label = dim && dim in CN_DIMENSION_LABELS ? CN_DIMENSION_LABELS[dim] : "（不明）";
                  return (
                    <span className="risk-tag" key={`${String(r.dimension)}-${label}`}>
                      {label}
                    </span>
                  );
                })
              ) : (
                <span className="risk-tag">（暂无明显集中项）</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="risk-top-title">现在最明显的问题</div>
            {topRiskNarrative.length ? (
              <p className="result-text cn-clamp-3" style={{ marginTop: 10 }}>
                {topRiskNarrative[0]}
              </p>
            ) : (
              <p className="result-text cn-clamp-3" style={{ marginTop: 10 }}>
                目前没有某一个环节特别突出。建议先从“复习和订正有没有被挤掉”开始看起。
              </p>
            )}
          </div>
        </section>

        <section className="result-module">
          <h2 className="result-h2">现在最重要的不是继续加量</h2>
          <p className="result-text cn-clamp-3">
            这时候最容易做的，是继续加量。
            但更重要的是先把顺序理清：今天必须做什么、哪些可以先减一点、复习和订正怎么回到日常里。
          </p>
        </section>

        <section className="result-module result-main-cta">
          <h2 className="result-cta-title">接下来这一周，最应该先调整哪里？</h2>
          <div className="result-cta-body">
            <p className="result-text">
              很多家庭的问题不是不努力，
              <br />
              而是不知道哪些该继续，哪些该先停下来。
            </p>
            <div className="result-text" style={{ marginTop: 12 }}>
              <div>补充6个问题后，你将获得：</div>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 2 }}>
                <li>本周最优先处理的问题</li>
                <li>哪些任务可以先暂停或减少</li>
                <li>家长应该介入到哪里</li>
                <li>接下来7天如何安排</li>
              </ul>
              <div style={{ marginTop: 12 }}>帮助先把家庭学习重新拉回稳定状态。</div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: "16px 18px",
                borderRadius: 20,
                border: "1px solid rgba(42, 64, 86, 0.12)",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: "#2A4056" }}>整理方案预览</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#8A8680" }}>实际内容会根据诊断结果和补充问题生成。</div>

              <div style={{ marginTop: 12, lineHeight: 1.7, color: "#3A4A5A" }}>
                <div style={{ fontWeight: 700, color: "#2A4056" }}>本周重点</div>
                <div style={{ marginTop: 4 }}>复习回收</div>
              </div>

              <div style={{ marginTop: 10, lineHeight: 1.7, color: "#3A4A5A" }}>
                <div style={{ fontWeight: 700, color: "#2A4056" }}>优先处理</div>
                <div style={{ marginTop: 6 }}>✓ 国语错题回顾</div>
                <div>✓ 算数订正复盘</div>
              </div>

              <div style={{ marginTop: 10, lineHeight: 1.7, color: "#3A4A5A" }}>
                <div style={{ fontWeight: 700, color: "#2A4056" }}>本周先减少</div>
                <div style={{ marginTop: 6 }}>✗ 新资料整理</div>
              </div>

              <div style={{ marginTop: 10, lineHeight: 1.7, color: "#3A4A5A" }}>
                <div style={{ fontWeight: 700, color: "#2A4056" }}>家长本周</div>
                <div style={{ marginTop: 6 }}>✓ 每天检查错题本</div>
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: "#8A8680", lineHeight: 1.7 }}>
                这是示例内容。
                实际方案会根据家庭情况生成。
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Link
              href={diagnosisId ? `/cn/followup?diagnosisId=${encodeURIComponent(diagnosisId)}` : "/cn/followup"}
              className="cta light"
              style={{ display: "inline-block", minWidth: 330, paddingLeft: 28, paddingRight: 28, fontSize: 18 }}
            >
              生成我家本周整理方案
            </Link>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#8A8680" }}>预计用时约1分钟</div>
        </section>

        <section className="result-module result-cta">
          <h2 className="result-cta-title">需要先咨询？</h2>
          <div className="result-cta-body">
            <p className="result-text">
              不确定是否需要整理方案，可以先添加微信，并发送诊断ID咨询。
            </p>
          </div>

          <div className="cn-wechat-qr">
            <Image src="/wechat-qr.jpg" alt="微信二维码" width={360} height={360} />
            <div className="cn-wechat-qr-note">扫码添加微信</div>
          </div>
          <div style={{ marginTop: 12 }} className="cn-wechat-row">
            <div className="cn-wechat-meta">
              <div>微信号：{WECHAT_ID}</div>
              {diagnosisId ? <div>诊断ID：{diagnosisId}</div> : null}
            </div>
          </div>
          <p className="result-text" style={{ marginTop: 6, fontSize: 13, color: "#6E6A64" }}>
            仅面向在日华人中学受験家庭。
          </p>
        </section>
      </main>
    </div>
  );
}
