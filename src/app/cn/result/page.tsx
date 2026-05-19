"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { StoredDiagnosisResult } from "@/lib/juken/types";
import { CN_DIMENSION_LABELS, CN_RESULT_TEMPLATES } from "@/data/cnResultTemplates";
import RiskRadarChart from "@/components/juken/RiskRadarChart";

const SESSION_KEY = "jukenDiagnosisResult";

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
  const type = (riskModel && typeof (riskModel as any).type === "string" ? String((riskModel as any).type) : "") as keyof typeof CN_RESULT_TEMPLATES;

  const template = useMemo(() => {
    if (!type || !(type in CN_RESULT_TEMPLATES)) return null;
    return CN_RESULT_TEMPLATES[type];
  }, [type]);

  const topRisks = (riskModel?.topRisks ?? []).slice(0, 2);

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

  const wechatId = process.env.NEXT_PUBLIC_WECHAT_ID || "";
  const wechatUrl = process.env.NEXT_PUBLIC_WECHAT_URL || "weixin://";

  const radarLabels = {
    homework_load: "宿题负荷",
    review_retention: "复习・定着不足",
    planning: "计划・优先顺位",
    parent_involvement: "家长介入过多",
    autonomy: "自主性不足",
    mental_load: "精神负荷",
  } as const;

  const topRiskNarrative = useMemo(() => {
    const dims = topRisks.map((r) => r.dimension);
    const parts: string[] = [];

    const has = (d: (typeof dims)[number]) => dims.includes(d);

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

  return (
    <div className="result-page cn-page">
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
          <p className="result-text" style={{ marginTop: 10 }}>
            {template.title}
          </p>
          <div className="risk-balance">
            <RiskRadarChart dimensionRisks={riskModel.dimensionRisks} labels={radarLabels} ariaLabel="家庭学习倾向（6项）" />

            <div className="risk-metrics" aria-label="各维度分数（1〜5）">
              {(
                [
                  ["宿题负荷", riskModel.dimensionRisks.homework_load],
                  ["复习・定着不足", riskModel.dimensionRisks.review_retention],
                  ["计划・优先顺位", riskModel.dimensionRisks.planning],
                  ["家长介入过多", riskModel.dimensionRisks.parent_involvement],
                  ["自主性不足", riskModel.dimensionRisks.autonomy],
                  ["精神负荷", riskModel.dimensionRisks.mental_load],
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
            <div className="risk-top-title">当前最明显的倾向</div>
            <div className="risk-top-tags">
              {topRisks.length ? (
                topRisks.map((r) => {
                  const label = CN_DIMENSION_LABELS[r.dimension];
                  return (
                    <span className="risk-tag" key={`${r.dimension}-${label}`}>
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
              <div style={{ marginTop: 8 }}>
                {topRiskNarrative.map((p) => (
                  <p key={p} className="result-text" style={{ marginTop: 10 }}>
                    {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="result-text" style={{ marginTop: 10 }}>
                目前没有某一个环节特别突出。建议先从“复习和订正有没有被挤掉”开始看起。
              </p>
            )}
          </div>
        </section>

        <section className="result-module">
          <h2 className="result-h2">现在最重要的不是继续加量</h2>
          <p className="result-text">
            很多家庭到了这个阶段，最容易做的事情是继续加量。<br />
            但真正需要先确认的是：今天必须做的是什么，可以暂时减少的是什么，家长该帮到哪里为止，复习和订正要怎么重新放回日常节奏里。<br />
            如果顺序没有整理好，学习时间越长，家庭反而越累。
          </p>
        </section>

        <section className="result-module result-cta">
          <h2 className="result-cta-title">想进一步确认你家现在该先调整哪里？</h2>
          <div className="result-cta-body">
            <p className="result-text">
              可以添加微信，把诊断结果截图发来。<br />
              请一起发送：孩子年级、所在塾、目前最困扰的一件事。<br />
              我会先帮你看：现在最应该优先整理的是哪一块。
            </p>
          </div>
          <div className="result-btn-row" style={{ justifyContent: "flex-start" }}>
            <a className="result-line-btn" href={wechatUrl} target="_blank" rel="noopener noreferrer">
              添加微信咨询
            </a>
          </div>
          {wechatId ? (
            <p className="result-text" style={{ marginTop: 10, fontSize: 13, color: "#6E6A64" }}>
              微信号：{wechatId}
            </p>
          ) : null}
          <p className="result-text" style={{ marginTop: 6, fontSize: 13, color: "#6E6A64" }}>
            仅面向在日华人中学受験家庭。
          </p>
        </section>
      </main>
    </div>
  );
}
