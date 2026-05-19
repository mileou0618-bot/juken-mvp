"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CN_DIAGNOSIS_QUESTIONS } from "@/data/cnDiagnosisQuestions";
import { calculateJukenDiagnosis } from "@/lib/juken/calculateDiagnosis";
import { buildDiagnosisResult } from "@/lib/jukenDiagnosisEngine";
import type { Profile, StoredDiagnosisResult } from "@/lib/juken/types";

const SESSION_KEY = "jukenDiagnosisResult";

function generateDiagnosisId(date: Date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `JUKEN-${yyyy}${mm}${dd}-${suffix}`;
}

const OPTIONS = [
  { label: "1", text: "完全不符合", value: 1 },
  { label: "2", text: "不太符合", value: 2 },
  { label: "3", text: "说不清/一般", value: 3 },
  { label: "4", text: "比较符合", value: 4 },
  { label: "5", text: "非常符合", value: 5 },
];

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export default function CnDiagnosisPage() {
  const router = useRouter();
  const [isSp, setIsSp] = useState(false);
  const [step, setStep] = useState(0);
  const perStep = isSp ? 4 : 18;
  const emailRef = useRef<HTMLInputElement | null>(null);
  const gradeRef = useRef<HTMLSelectElement | null>(null);

  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    grade: "",
    cramSchool: "",
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [profileErrors, setProfileErrors] = useState<{ email?: string; grade?: string }>({});
  const [questionErrorId, setQuestionErrorId] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setIsSp(isMobile());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalQuestions = CN_DIAGNOSIS_QUESTIONS.length;
  const start = step * perStep;
  const end = Math.min(start + perStep, totalQuestions);
  const currentQuestions = useMemo(() => CN_DIAGNOSIS_QUESTIONS.slice(start, end), [start, end]);

  const allAnswered = useMemo(
    () =>
      CN_DIAGNOSIS_QUESTIONS.every((q) => {
        const key = `q${q.id}`;
        return Number(answers[key]) >= 1 && Number(answers[key]) <= 5;
      }),
    [answers]
  );
  const currentAnswered = useMemo(
    () =>
      currentQuestions.every((q) => {
        const key = `q${q.id}`;
        return Number(answers[key]) >= 1 && Number(answers[key]) <= 5;
      }),
    [answers, currentQuestions]
  );

  const validateProfile = () => {
    const errors: { email?: string; grade?: string } = {};
    if (!profile.email.trim()) {
      errors.email = "请输入邮箱地址";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      errors.email = "请检查邮箱格式";
    }
    if (!profile.grade) errors.grade = "请选择年级";
    return errors;
  };

  const scrollToField = (id: string, focusEl?: HTMLElement | null) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => focusEl?.focus?.(), 220);
  };

  const scrollToQuestion = (questionId: number) => {
    const el = document.getElementById(`question-${questionId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      (el as HTMLElement).focus?.();
    }, 200);
  };

  const scrollToStepFirstQuestion = (nextStep: number) => {
    const first = CN_DIAGNOSIS_QUESTIONS[nextStep * perStep];
    if (!first) return;

    const run = () => {
      const el = document.getElementById(`question-${first.id}`);
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => (el as HTMLElement).focus?.(), 200);
      return true;
    };

    window.setTimeout(() => {
      if (run()) return;
      window.setTimeout(() => run(), 200);
    }, 120);
  };

  const goNext = () => {
    setSubmitError("");
    setProfileErrors({});
    setQuestionErrorId(null);

    const errors = validateProfile();
    if (errors.email || errors.grade) {
      if (isSp) {
        setProfileErrors(errors);
        if (errors.email) scrollToField("field-email", emailRef.current);
        else if (errors.grade) scrollToField("field-grade", gradeRef.current);
        return;
      }
      alert(errors.email || errors.grade || "请检查输入内容");
      return;
    }

    if (!currentAnswered) {
      const firstMissing = currentQuestions.find((q) => {
        const key = `q${q.id}`;
        return !(Number(answers[key]) >= 1 && Number(answers[key]) <= 5);
      });
      if (firstMissing) {
        setQuestionErrorId(firstMissing.id);
        scrollToQuestion(firstMissing.id);
      }
      return;
    }

    if (end >= totalQuestions) return;
    const nextStep = step + 1;
    setStep(nextStep);
    if (isSp) scrollToStepFirstQuestion(nextStep);
  };

  const goPrev = () => {
    if (step === 0) return router.push("/cn");
    const nextStep = Math.max(0, step - 1);
    setStep(nextStep);
    if (isSp) scrollToStepFirstQuestion(nextStep);
  };

  const submit = async () => {
    setSubmitError("");
    setProfileErrors({});
    setQuestionErrorId(null);

    const errors = validateProfile();
    if (errors.email || errors.grade) {
      if (isSp) {
        setProfileErrors(errors);
        if (errors.email) scrollToField("field-email", emailRef.current);
        else if (errors.grade) scrollToField("field-grade", gradeRef.current);
        return;
      }
      alert(errors.email || errors.grade || "请检查输入内容");
      return;
    }

    if (!allAnswered) {
      const firstMissing = CN_DIAGNOSIS_QUESTIONS.find((q) => {
        const key = `q${q.id}`;
        return !(Number(answers[key]) >= 1 && Number(answers[key]) <= 5);
      });
      if (firstMissing) {
        setQuestionErrorId(firstMissing.id);
        scrollToQuestion(firstMissing.id);
      }
      return;
    }

    setSubmitting(true);

    let diagnosis;
    try {
      diagnosis = calculateJukenDiagnosis(answers);
    } catch (err) {
      setSubmitting(false);
      alert(err instanceof Error ? err.message : "诊断失败");
      return;
    }

    const riskModel = buildDiagnosisResult(answers);
    const submittedAt = new Date().toISOString();
    const diagnosisId = generateDiagnosisId(new Date());
    const payload = {
      submittedAt,
      diagnosisId,
      language: "cn",
      name: profile.name.trim(),
      email: profile.email.trim(),
      grade: profile.grade,
      cramSchool: (profile.cramSchool ?? "").trim(),
      answers: Object.fromEntries(
        CN_DIAGNOSIS_QUESTIONS.map((q) => {
          const key = `q${q.id}`;
          return [key, Number(answers[key])] as const;
        })
      ),
      riskModel,
      scores: diagnosis.scores,
      diagnosisType: diagnosis.diagnosisType,
      diagnosisLabel: "",
      urgency: diagnosis.urgency,
      maxScore: diagnosis.maxScore,
    };

    try {
      const res = await fetch("/api/juken/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const apiJson = (await res.json().catch(() => null)) as
        | { error?: string; gas?: { sheetOk?: boolean; mailOk?: boolean; sheetError?: string; mailError?: string } | null }
        | null;

      if (!res.ok) {
        setSubmitError(apiJson?.error || "保存失败，请稍后再试");
        setSubmitting(false);
        return;
      }

      const sheetOk = apiJson?.gas?.sheetOk;
      const mailOk = apiJson?.gas?.mailOk;
      if (sheetOk === false && mailOk === false) {
        setSubmitError(apiJson?.gas?.sheetError || apiJson?.gas?.mailError || "保存失败，请稍后再试");
        setSubmitting(false);
        return;
      }

      const stored: StoredDiagnosisResult & { language?: "ja" | "cn" } = {
        diagnosisId,
        language: "cn",
        profile: {
          name: payload.name,
          email: payload.email,
          grade: payload.grade,
          cramSchool: payload.cramSchool || undefined,
        },
        answers: payload.answers,
        scores: payload.scores,
        diagnosisType: payload.diagnosisType,
        urgency: payload.urgency,
        maxScore: payload.maxScore,
        riskModel,
      };

      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
      } catch {
        // noop
      }

      setSubmitting(false);
      router.push("/cn/result");
    } catch {
      setSubmitError("保存失败，请稍后再试");
      setSubmitting(false);
    }
  };

  return (
    <div className="form-page cn-page">
      <header className="topbar">
        <button type="button" onClick={goPrev}>
          ← 返回
        </button>
        <b>{isSp ? `${end} / 18` : ""}</b>
      </header>

      <div className="progress">
        <div style={{ width: `${(end / 18) * 100}%` }} />
      </div>

      <main className="question-main">
        <p className="blue">18题 · 约3分钟</p>
        <h1>请告诉我们你家目前的学习情况</h1>
        <p className="desc">
          没有标准答案。请选择更接近日常情况的选项。
          <br />
          这不是对孩子或家长的评价，只是帮助你把家庭学习的运行方式说清楚。
        </p>

        <section className="q-card" aria-label="基本信息">
          <h2 className="q-title">基本信息</h2>
          <div className="info-card" style={{ marginTop: 14 }}>
            <label>
              姓名（可不填）
              <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="例如：王" />
            </label>

            <div id="field-email" className={profileErrors.email ? "field field-error" : "field"}>
              <label>
                邮箱（必填）
                <input
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  placeholder="example@email.com"
                  ref={emailRef}
                />
              </label>
              {profileErrors.email ? <p className="field-error-text">{profileErrors.email}</p> : null}
            </div>

            <div id="field-grade" className={profileErrors.grade ? "field field-error" : "field"}>
              <label>
                年级（必填）
                <select value={profile.grade} onChange={(e) => setProfile((p) => ({ ...p, grade: e.target.value }))} ref={gradeRef}>
                  <option value="">请选择</option>
                  <option>小学3年生</option>
                  <option>小学4年生</option>
                  <option>小学5年生</option>
                  <option>小学6年生</option>
                  <option>其他</option>
                </select>
              </label>
              {profileErrors.grade ? <p className="field-error-text">{profileErrors.grade}</p> : null}
            </div>

            <label>
              就读塾（可不填）
              <input
                value={profile.cramSchool ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, cramSchool: e.target.value }))}
                placeholder="例如：SAPIX、早稻田学院、日能研等"
              />
            </label>
          </div>
        </section>

        {currentQuestions.map((q, idx) => {
          const qIndex = start + idx + 1;
          const key = `q${q.id}`;
          const hasError = questionErrorId === q.id;
          return (
            <section className={hasError ? "q-card q-card-error" : "q-card"} key={q.id} id={`question-${q.id}`} tabIndex={-1}>
              <h2 className="q-title">
                Q{qIndex}. {q.text}
              </h2>
              {hasError ? <p className="field-error-text">请选择一个答案</p> : null}
              <div className="choices" role="radiogroup" aria-label={q.text}>
                {OPTIONS.map((o) => (
                  <label className={Number(answers[key]) === o.value ? "choice selected" : "choice"} key={o.value}>
                    <input
                      type="radio"
                      name={key}
                      checked={Number(answers[key]) === o.value}
                      onChange={() => setAnswers((a) => ({ ...a, [key]: o.value }))}
                    />
                    <b>{o.label}</b>
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <div className="bottom-nav">
        <button type="button" className="secondary" onClick={goPrev}>
          返回
        </button>
        {isSp && end < totalQuestions ? (
          <button type="button" className="primary" onClick={goNext}>
            下一页
          </button>
        ) : (
          <button type="button" className="primary" disabled={submitting} onClick={submit}>
            {submitting ? "提交中..." : "查看结果"}
          </button>
        )}
      </div>

      {submitError ? <div style={{ padding: "0 20px 16px", color: "#b42318", fontWeight: 800 }}>{submitError}</div> : null}
    </div>
  );
}
