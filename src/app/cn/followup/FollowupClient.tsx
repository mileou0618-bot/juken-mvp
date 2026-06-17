"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type FollowupPayload = {
  diagnosisId: string;
  gradeStage: string;
  jukuType: string;
  studyEndTime: string;
  hardestSubject: string;
  currentMainProblem: string;
  sacrificedArea: string;
  memo: string;
};

const JUKU_TYPES = ["SAPIX", "早稻田アカデミー", "四谷大塚", "日能研", "浜学園", "希学園", "其他"] as const;
const END_TIME = ["20点前", "20-21点", "21-22点", "22-23点", "23点以后"] as const;
const SUBJECTS = ["算数", "国语", "理科", "社会", "没有特别偏科"] as const;
const MAIN_PROBLEMS = ["作业做不完", "做完但没时间复习", "错题反复错", "家长不催就不动", "亲子冲突变多", "最近成绩/偏差值下降"] as const;
const TRADEOFFS = ["错题整理", "复习", "暗记", "测试准备", "亲子关系的余裕", "睡眠和休息"] as const;

export default function FollowupClient({ initialDiagnosisId }: { initialDiagnosisId: string }) {
  const diagnosisId = (initialDiagnosisId || "").trim();

  const [form, setForm] = useState<FollowupPayload>({
    diagnosisId,
    gradeStage: "",
    jukuType: "",
    studyEndTime: "",
    hardestSubject: "",
    currentMainProblem: "",
    sacrificedArea: "",
    memo: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrMissing, setQrMissing] = useState(false);

  // Keep diagnosisId in sync if user lands with query later.
  useEffect(() => {
    setForm((p) => ({ ...p, diagnosisId }));
  }, [diagnosisId]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyText = useMemo(() => {
    const lines = ["家庭学习整理"];
    if (diagnosisId) lines.push(`诊断ID：${diagnosisId}`);
    return lines.join("\n");
  }, [diagnosisId]);
  const displayDiagnosisId = diagnosisId || "未取得";

  const canSubmit =
    form.diagnosisId &&
    form.gradeStage &&
    form.jukuType &&
    form.studyEndTime &&
    form.hardestSubject &&
    form.currentMainProblem &&
    form.sacrificedArea;

  const onSubmit = async () => {
    if (submitting) return;
    setError("");

    if (!form.diagnosisId) {
      setError("无法识别诊断ID，请从结果页的链接进入。");
      return;
    }
    if (!canSubmit) {
      setError("请先填写完 6 个问题。");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/juken/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitFollowup",
          language: "cn",
          created_at: new Date().toISOString(),
          diagnosisId: form.diagnosisId,
          diagnosis_id: form.diagnosisId,
          grade_stage: form.gradeStage,
          juku_type: form.jukuType,
          study_end_time: form.studyEndTime,
          hardest_subject: form.hardestSubject,
          current_main_problem: form.currentMainProblem,
          sacrificed_area: form.sacrificedArea,
          hardest_tradeoff: form.sacrificedArea,
          memo: form.memo || "",
        }),
      });

      const text = await res.text().catch(() => "");
      const json = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })() as any;

      if (!res.ok) {
        // Avoid dumping HTML error pages into UI (e.g. Next.js runtime error pages).
        // Keep details in console for debugging.
        console.error("[cn/followup] submit failed", { status: res.status, text, json });
        setError("提交失败，请稍后再试。");
        setSubmitting(false);
        return;
      }

      setDone(true);
      setSubmitting(false);
    } catch {
      setError("提交失败，请稍后再试。");
      setSubmitting(false);
    }
  };

  if (!diagnosisId) {
    return (
      <main className="legal-page cn-page">
        <h1 className="legal-title">未找到诊断ID。</h1>
        <section className="legal-section">
          <p style={{ margin: 0 }}>
            请从诊断结果页进入补充问题页面。
            <br />
            （链接会自动携带诊断ID）
          </p>
        </section>
      </main>
    );
  }

  if (done) {
    return (
      <main className="legal-page cn-page">
        <h1 className="legal-title">已收到补充信息</h1>
        <section className="legal-section" style={{ display: "grid", gap: 18 }}>
          <p className="result-text" style={{ margin: 0 }}>
            根据诊断结果和补充信息，我们会整理一份《7天家庭学习整理包》。
          </p>

          <div className="cn-wechat-qr" style={{ maxWidth: 240, margin: "0 auto" }}>
            {!qrMissing ? (
              <Image
                src="/wechat-qr.jpg"
                alt="微信二维码"
                width={520}
                height={520}
                style={{ width: "100%", height: "auto", display: "block" }}
                priority
                onError={() => {
                  console.warn("[cn/followup] wechat qr image missing: /wechat-qr.jpg");
                  setQrMissing(true);
                }}
              />
            ) : null}
            <div className="cn-wechat-qr-note">扫码添加微信</div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <h2 className="result-title" style={{ margin: 0, fontSize: "1.25rem" }}>
              下一步：添加微信领取整理包
            </h2>
            <p className="result-text" style={{ margin: 0 }}>
              请添加下方微信，并发送：
            </p>
            <p className="result-text" style={{ margin: 0, whiteSpace: "pre-line" }}>
              {copyText}
            </p>
            <div className="result-text" style={{ margin: 0 }}>
              微信号：<strong>Juken-family</strong>
            </div>
            <div className="result-text" style={{ margin: 0 }}>
              诊断ID：{displayDiagnosisId}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              className="cta"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(copyText);
                  setCopied(true);
                } catch (e) {
                  console.error("[cn/followup] copy failed", e);
                }
              }}
              style={{ width: "auto", minWidth: 180 }}
            >
              复制微信发送内容
            </button>
            <span style={{ color: "#7A6E5C", fontSize: 14 }}>{copied ? "已复制，请到微信发送" : ""}</span>
          </div>

          <p className="result-text" style={{ margin: 0, color: "#5F5A52" }}>
            预计阅读时间：3分钟左右
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="legal-page cn-page">
      <h1 className="legal-title">补充 6 个问题</h1>
      <p className="result-text" style={{ marginTop: 10 }}>
        这 6 个问题只用于把建议整理得更贴近你家的实际情况。
      </p>

      <section className="legal-section">
        <p className="result-text" style={{ margin: 0, color: "#5F5A52" }}>
          诊断ID：{diagnosisId}
        </p>

        <div className="field">
          <label>
            1. 孩子现在几年级？
            <select value={form.gradeStage} onChange={(e) => setForm((p) => ({ ...p, gradeStage: e.target.value }))}>
              <option value="">请选择</option>
              <option>小学3年级</option>
              <option>小学4年级</option>
              <option>小学5年级</option>
              <option>小学6年级</option>
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            2. 目前主要上哪类补习班？
            <select value={form.jukuType} onChange={(e) => setForm((p) => ({ ...p, jukuType: e.target.value }))}>
              <option value="">请选择</option>
              {JUKU_TYPES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            3. 平日通常学习到几点结束？
            <select value={form.studyEndTime} onChange={(e) => setForm((p) => ({ ...p, studyEndTime: e.target.value }))}>
              <option value="">请选择</option>
              {END_TIME.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            4. 这一周最卡的是哪一科？
            <select value={form.hardestSubject} onChange={(e) => setForm((p) => ({ ...p, hardestSubject: e.target.value }))}>
              <option value="">请选择</option>
              {SUBJECTS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            5. 现在最困扰的是哪一个？
            <select value={form.currentMainProblem} onChange={(e) => setForm((p) => ({ ...p, currentMainProblem: e.target.value }))}>
              <option value="">请选择</option>
              {MAIN_PROBLEMS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            6. 最近最容易被挤掉的是哪一项？
            <select value={form.sacrificedArea} onChange={(e) => setForm((p) => ({ ...p, sacrificedArea: e.target.value }))}>
              <option value="">请选择</option>
              {TRADEOFFS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field w-full" style={{ width: "100%" }}>
          <div className="space-y-2 w-full" style={{ width: "100%" }}>
            <label style={{ fontSize: "0.92em", fontWeight: 600, opacity: 0.72 }}>备注（可选）</label>
            <textarea
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
              placeholder="如有需要补充的情况，可简单说明"
              rows={5}
              className="w-full max-w-none px-4 py-3 text-[15px]"
              style={{
                width: "100%",
                maxWidth: "none",
                boxSizing: "border-box",
                minHeight: 120,
                lineHeight: "1.5rem",
                resize: "vertical",
                borderRadius: 12,
                background: "#fff",
                padding: "12px 16px",
                fontSize: 15,
              }}
            />
          </div>
        </div>

        {error ? <p style={{ marginTop: 12, color: "#b42318", fontWeight: 650 }}>{error}</p> : null}

        <div style={{ marginTop: 14 }}>
          <button type="button" className="cta" disabled={submitting} onClick={onSubmit}>
            {submitting ? "提交中..." : "提交补充信息"}
          </button>
        </div>
      </section>
    </main>
  );
}
