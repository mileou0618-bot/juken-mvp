"use client";

import { useMemo, useState } from "react";
import RiskRadarChart from "@/components/juken/RiskRadarChart";
import type { DimensionRisks } from "@/lib/juken/types";

type LookupResponse =
  | { error: string }
  | {
      ok: boolean;
      gasStatus: number;
      gas: any;
      raw?: string;
    };

export default function AdminDiagnosisLookupPage() {
  const [diagnosisId, setDiagnosisId] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const lookup = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/diagnosis-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosisId, adminKey }),
      });
      const json = (await res.json().catch(() => null)) as LookupResponse | null;
      if (!res.ok) {
        const code = (json as any)?.error;
        if (res.status === 401 || code === "UNAUTHORIZED") {
          setError("管理キーが正しくありません。");
        } else if (res.status === 400 && code === "diagnosisId is required") {
          setError("診断IDを入力してください。");
        } else {
          setError("検索に失敗しました。");
        }
        setLoading(false);
        return;
      }
      setResult(json);
      setLoading(false);
    } catch (e) {
      setError("検索に失敗しました。");
      setLoading(false);
    }
  };

  const diagnosis = result?.gas?.diagnosis ?? null;
  const dimensions = (diagnosis?.dimensions ?? null) as DimensionRisks | null;
  const answers = diagnosis?.answers ?? null;

  const hasRadar = useMemo(() => {
    if (!dimensions) return false;
    return (
      typeof dimensions.homework_load === "number" &&
      typeof dimensions.review_retention === "number" &&
      typeof dimensions.planning === "number" &&
      typeof dimensions.parent_involvement === "number" &&
      typeof dimensions.autonomy === "number" &&
      typeof dimensions.mental_load === "number"
    );
  }, [dimensions]);

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 14 }}>診断結果検索（内部用）</h1>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>診断ID</span>
          <input
            value={diagnosisId}
            onChange={(e) => setDiagnosisId(e.target.value)}
            placeholder="JUKEN-20260519-A8K3QZ"
            style={{ padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>管理キー</span>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="（入力してください）"
            style={{ padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={lookup}
          disabled={loading || !diagnosisId.trim() || !adminKey.trim()}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background: loading ? "#eee" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "検索中..." : "検索する"}
        </button>
      </div>

      {error ? <p style={{ marginTop: 12, color: "#b42318" }}>{error}</p> : null}

      {result ? (
        <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
          <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
            <div style={{ fontSize: 12, color: "#555" }}>GASステータス: {result.gasStatus}</div>
            {result.gas?.ok === false ? <div style={{ color: "#b42318" }}>GASエラー: {result.gas.error}</div> : null}
            {result.gas?.warning ? <div style={{ color: "#7a5" }}>warning: {String(result.gas.warning)}</div> : null}
            {result.gas?.ok === false && result.gas?.debug ? (
              <pre style={{ marginTop: 10, fontSize: 12, overflowX: "auto" }}>{JSON.stringify(result.gas.debug, null, 2)}</pre>
            ) : null}
          </div>

          {diagnosis ? (
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>診断</h2>
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 14 }}>
                <div>診断ID: {diagnosis.diagnosisId}</div>
                <div>送信日時: {diagnosis.submittedAt}</div>
                <div>保護者名: {diagnosis.parentName}</div>
                <div>メールアドレス: {diagnosis.email}</div>
                <div>表示タイプ: {diagnosis.diagnosisLabel}</div>
                <div>内部タイプ: {diagnosis.diagnosisType}</div>
                <div>総合リスク: {diagnosis.overallRisk}</div>
                <div>今週の優先アクション: {diagnosis.thisWeekAction}</div>
                <div>language: {diagnosis.language}</div>
              </div>
            </div>
          ) : null}

          {hasRadar && dimensions ? (
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>6項目スコア</h2>
              <div style={{ marginTop: 10 }}>
                <RiskRadarChart dimensionRisks={dimensions} />
              </div>
            </div>
          ) : null}

          {answers ? (
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>18問回答</h2>
              <pre style={{ marginTop: 10, fontSize: 12, overflowX: "auto" }}>{JSON.stringify(answers, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
