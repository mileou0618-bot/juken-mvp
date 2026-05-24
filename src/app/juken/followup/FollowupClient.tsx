"use client";

import { useEffect, useState } from "react";

type FollowupPayload = {
  diagnosisId: string;
  gradeStage: string;
  jukuType: string;
  studyEndTime: string;
  hardestSubject: string;
  currentMainProblem: string;
  hardestTradeoff: string;
  memo: string;
};

const JUKU_TYPES = ["SAPIX", "早稲田アカデミー", "四谷大塚", "日能研", "浜学園", "希学園", "その他"] as const;
const END_TIME = ["20時前", "20-21時", "21-22時", "22-23時", "23時以降"] as const;
const SUBJECTS = ["算数", "国語", "理科", "社会", "特に偏りなし"] as const;
const MAIN_PROBLEMS = ["宿題が終わらない", "終わるが復習できない", "間違い直しが回らない", "声かけがないと動かない", "親子の衝突が増えた"] as const;
const TRADEOFFS = ["塾の宿題が多すぎる", "間違い直しが多すぎる", "テスト直しが間に合わない", "暗記系が後回しになる", "減らす判断が難しい"] as const;

export default function JukenFollowupClient({ initialDiagnosisId }: { initialDiagnosisId: string }) {
  const diagnosisId = (initialDiagnosisId || "").trim();

  const [form, setForm] = useState<FollowupPayload>({
    diagnosisId,
    gradeStage: "",
    jukuType: "",
    studyEndTime: "",
    hardestSubject: "",
    currentMainProblem: "",
    hardestTradeoff: "",
    memo: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((p) => ({ ...p, diagnosisId }));
  }, [diagnosisId]);

  const canSubmit =
    form.diagnosisId &&
    form.gradeStage &&
    form.jukuType &&
    form.studyEndTime &&
    form.hardestSubject &&
    form.currentMainProblem &&
    form.hardestTradeoff;

  const onSubmit = async () => {
    if (submitting) return;
    setError("");
    if (!form.diagnosisId) {
      setError("診断IDを取得できませんでした。結果ページから開いてください。");
      return;
    }
    if (!canSubmit) {
      setError("6つの質問にすべて回答してください。");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/juken/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submitFollowup",
          language: "jp",
          created_at: new Date().toISOString(),
          diagnosisId: form.diagnosisId,
          diagnosis_id: form.diagnosisId,
          grade_stage: form.gradeStage,
          juku_type: form.jukuType,
          study_end_time: form.studyEndTime,
          hardest_subject: form.hardestSubject,
          current_main_problem: form.currentMainProblem,
          hardest_tradeoff: form.hardestTradeoff,
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
        const details = json?.error || json?.message || text;
        setError(String(details || "送信に失敗しました。しばらくして再度お試しください。"));
        setSubmitting(false);
        return;
      }

      setDone(true);
      setSubmitting(false);
    } catch {
      setError("送信に失敗しました。しばらくして再度お試しください。");
      setSubmitting(false);
    }
  };

  if (!diagnosisId) {
    return (
      <main className="legal-page">
        <h1 className="legal-title">診断IDが見つかりませんでした。</h1>
        <section className="legal-section">
          <p style={{ margin: 0 }}>診断結果ページから、補足質問ページを開いてください。</p>
        </section>
      </main>
    );
  }

  if (done) {
    return (
      <main className="legal-page">
        <h1 className="legal-title">受け付けました。</h1>
        <section className="legal-section">
          <p style={{ margin: 0 }}>7日間の整理案を作成しています。</p>
        </section>
      </main>
    );
  }

  return (
    <main className="legal-page">
      <h1 className="legal-title">追加 6 問</h1>
      <p className="result-text" style={{ marginTop: 10 }}>
        今週の「取捨選択」を判断するための補足質問です。
      </p>

      <section className="legal-section">
        <p className="result-text" style={{ margin: 0, color: "#5F5A52" }}>
          診断ID：{diagnosisId}
        </p>

        <div className="field">
          <label>
            Q1 現在の学年を教えてください
            <select value={form.gradeStage} onChange={(e) => setForm((p) => ({ ...p, gradeStage: e.target.value }))}>
              <option value="">選択してください</option>
              <option>小学3年生</option>
              <option>小学4年生</option>
              <option>小学5年生</option>
              <option>小学6年生</option>
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            Q2 現在メインで通っている塾を教えてください
            <select value={form.jukuType} onChange={(e) => setForm((p) => ({ ...p, jukuType: e.target.value }))}>
              <option value="">選択してください</option>
              {JUKU_TYPES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            Q3 平日はだいたい何時頃まで勉強していますか？
            <select value={form.studyEndTime} onChange={(e) => setForm((p) => ({ ...p, studyEndTime: e.target.value }))}>
              <option value="">選択してください</option>
              {END_TIME.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            Q4 今いちばん止まりやすい科目はどれですか？
            <select value={form.hardestSubject} onChange={(e) => setForm((p) => ({ ...p, hardestSubject: e.target.value }))}>
              <option value="">選択してください</option>
              {SUBJECTS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            Q5 今の状態に最も近いものを選んでください
            <select
              value={form.currentMainProblem}
              onChange={(e) => setForm((p) => ({ ...p, currentMainProblem: e.target.value }))}
            >
              <option value="">選択してください</option>
              {MAIN_PROBLEMS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            Q6 今週いちばん「減らすか迷っているもの」は何ですか？
            <select
              value={form.hardestTradeoff}
              onChange={(e) => setForm((p) => ({ ...p, hardestTradeoff: e.target.value }))}
            >
              <option value="">選択してください</option>
              {TRADEOFFS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            メモ（任意）
            <textarea
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
              placeholder="例：今週はテストが多い、算数が重い等"
              rows={4}
            />
          </label>
        </div>

        {error ? <p style={{ marginTop: 12, color: "#b42318", fontWeight: 650 }}>{error}</p> : null}

        <div style={{ marginTop: 14 }}>
          <button type="button" className="cta" disabled={submitting} onClick={onSubmit}>
            {submitting ? "送信中..." : "送信する"}
          </button>
        </div>
      </section>
    </main>
  );
}

