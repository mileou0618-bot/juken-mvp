"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JUKEN_DIAGNOSIS_QUESTIONS } from "@/data/jukenDiagnosisQuestions";
import { calculateJukenDiagnosis } from "@/lib/juken/calculateDiagnosis";
import { buildDiagnosisResult } from "@/lib/jukenDiagnosisEngine";
import type { Profile, StoredDiagnosisResult } from "@/lib/juken/types";
import { JUKEN_RESULT_TEMPLATES } from "@/data/jukenResultTemplates";

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
  { label: "1", text: "まったく当てはまらない", value: 1 },
  { label: "2", text: "あまり当てはまらない", value: 2 },
  { label: "3", text: "どちらともいえない", value: 3 },
  { label: "4", text: "やや当てはまる", value: 4 },
  { label: "5", text: "とても当てはまる", value: 5 },
];

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export default function JukenDiagnosisPage() {
  const router = useRouter();
  const [isSp, setIsSp] = useState(false);
  const [step, setStep] = useState(0);
  const perStep = isSp ? 4 : 18;
  const emailRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
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
  const [profileErrors, setProfileErrors] = useState<{ name?: string; email?: string; grade?: string }>({});
  const [questionErrorId, setQuestionErrorId] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setIsSp(isMobile());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalQuestions = JUKEN_DIAGNOSIS_QUESTIONS.length;
  const start = step * perStep;
  const end = Math.min(start + perStep, totalQuestions);
  const currentQuestions = useMemo(() => JUKEN_DIAGNOSIS_QUESTIONS.slice(start, end), [start, end]);

  const allAnswered = useMemo(
    () =>
      JUKEN_DIAGNOSIS_QUESTIONS.every((q) => {
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
    const errors: { name?: string; email?: string; grade?: string } = {};

    if (!profile.email.trim()) {
      errors.email = "メールアドレスを入力してください";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      errors.email = "メールアドレスの形式を確認してください";
    }

    if (!profile.grade) {
      errors.grade = "学年を選択してください";
    }

    return errors;
  };

  const scrollToField = (id: string, focusEl?: HTMLElement | null) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => focusEl?.focus?.(), 220);
  };

  const scrollToEmail = () => {
    const el = emailRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => el.focus(), 200);
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
    const first = JUKEN_DIAGNOSIS_QUESTIONS[nextStep * perStep];
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
      window.setTimeout(() => {
        run();
      }, 200);
    }, 120);
  };

  const goNext = () => {
    if (submitting) return;
    setSubmitError("");
    setProfileErrors({});
    setQuestionErrorId(null);

    const errors = validateProfile();
    const hasProfileErrors = Boolean(errors.email || errors.grade || errors.name);
    if (hasProfileErrors) {
      if (isSp) {
        setProfileErrors(errors);
        if (errors.name) scrollToField("field-name", nameRef.current);
        else if (errors.email) scrollToField("field-email", emailRef.current);
        else if (errors.grade) scrollToField("field-grade", gradeRef.current);
        return;
      }
      const message = errors.name || errors.email || errors.grade || "入力内容を確認してください。";
      alert(message);
      if (errors.email) scrollToEmail();
      return;
    }
    if (!currentAnswered) {
      const firstMissing = currentQuestions.find((q) => {
        const key = `q${q.id}`;
        return !(Number(answers[key]) >= 1 && Number(answers[key]) <= 5);
      });
      if (firstMissing) {
        setQuestionErrorId(firstMissing.id);
        if (!isSp) alert("このページの質問にすべて回答してください。");
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
    if (submitting) return;
    if (step === 0) return router.push("/juken");
    const nextStep = Math.max(0, step - 1);
    setStep(nextStep);
    if (isSp) scrollToStepFirstQuestion(nextStep);
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitError("");
    setProfileErrors({});
    setQuestionErrorId(null);

    const errors = validateProfile();
    const hasProfileErrors = Boolean(errors.email || errors.grade || errors.name);
    if (hasProfileErrors) {
      if (isSp) {
        setProfileErrors(errors);
        if (errors.name) scrollToField("field-name", nameRef.current);
        else if (errors.email) scrollToField("field-email", emailRef.current);
        else if (errors.grade) scrollToField("field-grade", gradeRef.current);
        return;
      }
      const message = errors.name || errors.email || errors.grade || "入力内容を確認してください。";
      alert(message);
      if (errors.email) scrollToEmail();
      return;
    }
    if (!allAnswered) {
      const firstMissing = JUKEN_DIAGNOSIS_QUESTIONS.find((q) => {
        const key = `q${q.id}`;
        return !(Number(answers[key]) >= 1 && Number(answers[key]) <= 5);
      });
      if (firstMissing) {
        setQuestionErrorId(firstMissing.id);
        if (!isSp) alert("未回答の質問があります。すべて回答してください。");
        scrollToQuestion(firstMissing.id);
      }
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    let diagnosis;
    try {
      diagnosis = calculateJukenDiagnosis(answers);
    } catch (err) {
      setSubmitting(false);
      alert(err instanceof Error ? err.message : "診断に失敗しました。");
      return;
    }

    const template = JUKEN_RESULT_TEMPLATES[diagnosis.diagnosisType];
    const riskModel = buildDiagnosisResult(answers);

    const submittedAt = new Date().toISOString();
    const diagnosisId = generateDiagnosisId(new Date());
    const payload = {
      submittedAt,
      diagnosisId,
      language: "ja",
      name: profile.name.trim(),
      email: profile.email.trim(),
      grade: profile.grade,
      cramSchool: (profile.cramSchool ?? "").trim(),
      answers: Object.fromEntries(
        JUKEN_DIAGNOSIS_QUESTIONS.map((q) => {
          const key = `q${q.id}`;
          return [key, Number(answers[key])] as const;
        })
      ),
      riskModel,
      scores: diagnosis.scores,
      diagnosisType: diagnosis.diagnosisType,
      // Do not send legacy display labels to API/GAS/Sheet.
      // The unified user-facing copy is derived from riskModel.type via resultDisplayMap.
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
        setSubmitError(apiJson?.error || "診断結果の作成に失敗しました。時間をおいて再度お試しください。");
        setSubmitting(false);
        return;
      }

      const sheetOk = apiJson?.gas?.sheetOk;
      const mailOk = apiJson?.gas?.mailOk;
      const hasAnyOk = sheetOk === true || mailOk === true;
      if (sheetOk === false && mailOk === false) {
        setSubmitError(
          apiJson?.gas?.sheetError ||
            apiJson?.gas?.mailError ||
            "診断結果の作成に失敗しました。時間をおいて再度お試しください。"
        );
        setSubmitting(false);
        return;
      }

      // If GAS didn't return a parseable JSON, still allow the flow (web result is local),
      // but if it DID return and both failed, we already returned above.
      if (!hasAnyOk && apiJson?.gas) {
        setSubmitError(
          apiJson?.gas?.sheetError ||
            apiJson?.gas?.mailError ||
            "診断結果の作成に失敗しました。時間をおいて再度お試しください。"
        );
        setSubmitting(false);
        return;
      }

      const stored: StoredDiagnosisResult = {
        diagnosisId,
        language: "ja",
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
      router.push("/juken/result");
    } catch {
      setSubmitError("診断結果の作成に失敗しました。時間をおいて再度お試しください。");
      setSubmitting(false);
    }
  };

  return (
    <div className="form-page">
      <header className="topbar">
        <button type="button" onClick={goPrev} disabled={submitting} aria-disabled={submitting}>
          ← 戻る
        </button>
        <b>{isSp ? `${end} / 18` : ""}</b>
      </header>

      <div className="progress">
        <div style={{ width: `${(end / 18) * 100}%` }} />
      </div>

      <main className="question-main">
        <p className="blue">18問・約3分</p>
        <h1>ご家庭での学習状況を教えてください</h1>
        <p className="desc">
          正解・不正解はありません。ふだんの様子に近いものを選んでください。
          <br />
          お子さまや保護者の方を評価するものではなく、今の家庭学習の回り方を確認するためのチェックです。
        </p>

        <section className="q-card" aria-label="基本情報">
          <h2 className="q-title">基本情報</h2>
          <div className="info-card" style={{ marginTop: 14 }}>
            <div id="field-name" className={profileErrors.name ? "field field-error" : "field"}>
              <label>
                お名前（任意）
                <input
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  placeholder="例：山田"
                  ref={nameRef}
                />
              </label>
              {profileErrors.name ? <p className="field-error-text">{profileErrors.name}</p> : null}
            </div>
            <div id="field-email" className={profileErrors.email ? "field field-error" : "field"}>
              <label>
                メールアドレス
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
                お子さまの学年
                <select
                  value={profile.grade}
                  onChange={(e) => setProfile((p) => ({ ...p, grade: e.target.value }))}
                  ref={gradeRef}
                >
                  <option value="">選択してください</option>
                  <option>小学3年生</option>
                  <option>小学4年生</option>
                  <option>小学5年生</option>
                  <option>小学6年生</option>
                  <option>その他</option>
                </select>
              </label>
              {profileErrors.grade ? <p className="field-error-text">{profileErrors.grade}</p> : null}
            </div>
            <label>
              通っている塾（任意）
              <input
                value={profile.cramSchool ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, cramSchool: e.target.value }))}
                placeholder="例: SAPIX、早稲田アカデミー、日能研など"
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
              {hasError ? <p className="field-error-text">回答を選択してください</p> : null}
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
        <button type="button" className="secondary" onClick={goPrev} disabled={submitting} aria-disabled={submitting}>
          戻る
        </button>
        {isSp && end < totalQuestions ? (
          <button type="button" className="primary" onClick={goNext} disabled={submitting} aria-disabled={submitting}>
            次へ
          </button>
        ) : (
          <button type="button" className="primary" disabled={submitting} onClick={submit}>
            {submitting ? "診断結果を作成中..." : "診断結果を見る"}
          </button>
        )}
      </div>

      {submitting ? (
        <div style={{ padding: "8px 20px 16px", color: "#6E6A64", fontWeight: 600 }}>
          結果を作成しています。このままお待ちください。
        </div>
      ) : null}

      {submitError ? (
        <div style={{ padding: "0 20px 16px", color: "#b42318", fontWeight: 800 }}>{submitError}</div>
      ) : null}
    </div>
  );
}
