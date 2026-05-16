"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { JUKEN_DIAGNOSIS_QUESTIONS } from "@/data/jukenDiagnosisQuestions";
import { calculateJukenDiagnosis } from "@/lib/juken/calculateDiagnosis";
import { buildDiagnosisResult } from "@/lib/jukenDiagnosisEngine";
import type { Profile, StoredDiagnosisResult } from "@/lib/juken/types";
import { JUKEN_RESULT_TEMPLATES } from "@/data/jukenResultTemplates";

const SESSION_KEY = "jukenDiagnosisResult";

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

  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    grade: "",
    cramSchool: "",
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const update = () => setIsSp(isMobile());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalQuestions = JUKEN_DIAGNOSIS_QUESTIONS.length;
  const start = step * perStep;
  const end = Math.min(start + perStep, totalQuestions);
  const currentQuestions = useMemo(
    () => JUKEN_DIAGNOSIS_QUESTIONS.slice(start, end),
    [start, end]
  );

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
    if (!profile.email.trim()) return "メールアドレスを入力してください。";
    if (!profile.grade) return "お子さまの学年を選択してください。";
    return "";
  };

  const goNext = () => {
    const message = validateProfile();
    if (message) return alert(message);
    if (!currentAnswered) return alert("このページの質問にすべて回答してください。");
    if (end >= totalQuestions) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    if (step === 0) return router.push("/");
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const message = validateProfile();
    if (message) return alert(message);
    if (!allAnswered) return alert("未回答の質問があります。すべて回答してください。");

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
    const payload = {
      submittedAt,
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
      diagnosisLabel: template.diagnosisLabel,
      urgency: diagnosis.urgency,
      maxScore: diagnosis.maxScore,
    };

    try {
      const res = await fetch("/api/juken/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setSubmitError(data?.error || "結果の保存に失敗しました。");
      }
    } catch {
      setSubmitError("結果の保存に失敗しました。");
    } finally {
      const stored: StoredDiagnosisResult = {
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

      // iOS Safari private mode may throw; ignore to avoid breaking the flow.
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
      } catch {
        // noop
      }
      setSubmitting(false);
      router.push("/juken/result");
    }
  };

  return (
    <div className="form-page">
      <header className="topbar">
        <button type="button" onClick={goPrev}>
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
        <p className="desc">正解・不正解はありません。ふだんの様子に近いものを選んでください。</p>

        <section className="q-card" aria-label="基本情報">
          <h2 className="q-title">基本情報</h2>
          <div className="info-card" style={{ marginTop: 14 }}>
            <label>
              お名前（任意）
              <input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                placeholder="例：山田"
              />
            </label>
            <label>
              メールアドレス
              <input
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                placeholder="example@email.com"
              />
            </label>
            <label>
              お子さまの学年
              <select value={profile.grade} onChange={(e) => setProfile((p) => ({ ...p, grade: e.target.value }))}>
                <option value="">選択してください</option>
                <option>小学3年生</option>
                <option>小学4年生</option>
                <option>小学5年生</option>
                <option>小学6年生</option>
                <option>その他</option>
              </select>
            </label>
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
          return (
            <section className="q-card" key={q.id}>
              <h2 className="q-title">
                Q{qIndex}. {q.text}
              </h2>
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
          戻る
        </button>
        {isSp && end < totalQuestions ? (
          <button type="button" className="primary" onClick={goNext}>
            次へ
          </button>
        ) : (
          <button type="button" className="primary" disabled={submitting} onClick={submit}>
            {submitting ? "送信中..." : "診断結果を見る"}
          </button>
        )}
      </div>

      {submitError ? <div style={{ padding: "0 20px 16px", color: "#b42318", fontWeight: 800 }}>{submitError}</div> : null}
    </div>
  );
}
