"use client";

import { useEffect, useState } from "react";

type FollowupPayload = {
  diagnosisId: string;
  grade: string;
  jukuType: string;
  weekdayEndTime: string;
  weakSubject: string;
  mainProblem: string;
  parentRole: string;
  memo: string;
};

const JUKU_TYPES = ["SAPIX", "早稻田学院", "四谷大塚", "日能研", "个别", "其他"] as const;
const WEAK_SUBJECTS = ["算数", "国语", "理科", "社会", "不确定"] as const;
const MAIN_PROBLEMS = ["作业做不完", "做完但复习不了", "错题反复错", "家长不催就不动", "亲子冲突大"] as const;
const PARENT_ROLES = ["催进度", "陪着做", "讲题", "安排计划", "检查作业", "基本管不了"] as const;

export default function FollowupClient({ initialDiagnosisId }: { initialDiagnosisId: string }) {
  const diagnosisId = (initialDiagnosisId || "").trim();

  const [form, setForm] = useState<FollowupPayload>({
    diagnosisId,
    grade: "",
    jukuType: "",
    weekdayEndTime: "",
    weakSubject: "",
    mainProblem: "",
    parentRole: "",
    memo: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Keep diagnosisId in sync if user lands with query later.
  useEffect(() => {
    if (!diagnosisId) return;
    setForm((p) => (p.diagnosisId ? p : { ...p, diagnosisId }));
  }, [diagnosisId]);

  const canSubmit =
    form.diagnosisId &&
    form.grade &&
    form.jukuType &&
    form.weekdayEndTime &&
    form.weakSubject &&
    form.mainProblem &&
    form.parentRole;

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
          createdAt: new Date().toISOString(),
          diagnosisId: form.diagnosisId,
          grade: form.grade,
          juku_type: form.jukuType,
          weekday_end_time: form.weekdayEndTime,
          weak_subject: form.weakSubject,
          main_problem: form.mainProblem,
          parent_role: form.parentRole,
          memo: form.memo || "",
        }),
      });

      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(String(json?.error || "提交失败，请稍后再试。"));
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

  if (done) {
    return (
      <main className="legal-page cn-page">
        <h1 className="legal-title">已收到补充信息。</h1>
        <section className="legal-section">
          <p style={{ margin: 0 }}>
            正在整理 7 天家庭学习建议。
            <br />
            稍后我们会根据诊断结果进行确认。
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
        <div className="field" id="field-diagnosisId">
          <label>
            诊断ID
            <input
              value={form.diagnosisId}
              onChange={(e) => setForm((p) => ({ ...p, diagnosisId: e.target.value }))}
              placeholder="例如：JUKEN-20260519-A8K3QZ"
            />
          </label>
        </div>

        <div className="field">
          <label>
            1. 孩子现在几年级？
            <select value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}>
              <option value="">请选择</option>
              <option>小学3年生</option>
              <option>小学4年生</option>
              <option>小学5年生</option>
              <option>小学6年生</option>
              <option>其他</option>
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
            <input
              value={form.weekdayEndTime}
              onChange={(e) => setForm((p) => ({ ...p, weekdayEndTime: e.target.value }))}
              placeholder="例如：21:30"
            />
          </label>
        </div>

        <div className="field">
          <label>
            4. 现在最卡的是哪一科？
            <select value={form.weakSubject} onChange={(e) => setForm((p) => ({ ...p, weakSubject: e.target.value }))}>
              <option value="">请选择</option>
              {WEAK_SUBJECTS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            5. 最大问题更接近哪一种？
            <select value={form.mainProblem} onChange={(e) => setForm((p) => ({ ...p, mainProblem: e.target.value }))}>
              <option value="">请选择</option>
              {MAIN_PROBLEMS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            6. 家长现在主要在做什么？
            <select value={form.parentRole} onChange={(e) => setForm((p) => ({ ...p, parentRole: e.target.value }))}>
              <option value="">请选择</option>
              {PARENT_ROLES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            备注（可选）
            <textarea
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
              placeholder="例如：最近作业量明显增加、孩子睡眠不足等"
              rows={4}
            />
          </label>
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

