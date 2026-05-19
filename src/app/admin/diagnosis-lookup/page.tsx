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

const DIMENSION_LABELS: Record<keyof DimensionRisks, string> = {
  homework_load: "宿題負荷",
  review_retention: "復習・定着不足",
  planning: "計画・優先順位",
  parent_involvement: "親の関与過多",
  autonomy: "自走性不足",
  mental_load: "精神的負荷",
};

function formatScore(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

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
  const debug = result?.gas?.debug ?? null;

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

  const top3 = useMemo(() => {
    if (!dimensions) return [];
    const entries = (Object.keys(DIMENSION_LABELS) as Array<keyof DimensionRisks>)
      .map((k) => ({ key: k, label: DIMENSION_LABELS[k], score: Number((dimensions as any)[k]) }))
      .filter((x) => Number.isFinite(x.score))
      .sort((a, b) => b.score - a.score);
    return entries.slice(0, 3);
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
            {result.gas?.warning ? <div style={{ color: "#7a5" }}>警告: {String(result.gas.warning)}</div> : null}
          </div>

          {diagnosis ? (
            <div
              style={{
                padding: 18,
                border: "1px solid #ddd",
                borderRadius: 12,
                background: "#fff",
                display: "grid",
                gap: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#555" }}>表示タイプ</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6, lineHeight: 1.25 }}>{diagnosis.diagnosisLabel}</div>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.1fr 0.9fr" }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      padding: 14,
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      background: "#fbfbfb",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#555" }}>総合リスク</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{formatScore(diagnosis.overallRisk)}</div>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      background: "#fbfbfb",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#555" }}>今週の優先アクション</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>{diagnosis.thisWeekAction}</div>
                  </div>

                  <div style={{ fontSize: 13, color: "#333", display: "grid", gap: 4 }}>
                    <div>送信日時：{diagnosis.submittedAt}</div>
                    <div>診断ID：{diagnosis.diagnosisId}</div>
                    <div>保護者名：{diagnosis.parentName}</div>
                    <div>メールアドレス：{diagnosis.email}</div>
                    <div>言語：{diagnosis.language}</div>
                    <div>内部タイプ：{diagnosis.diagnosisType}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {hasRadar && dimensions ? (
                    <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fbfbfb" }}>
                      <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>6項目スコア</div>
                      <RiskRadarChart dimensionRisks={dimensions} />
                    </div>
                  ) : (
                    <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fbfbfb" }}>
                      <div style={{ fontSize: 12, color: "#555" }}>6項目スコア</div>
                      <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>（スコア情報がありません）</div>
                    </div>
                  )}

                  <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fbfbfb" }}>
                    <div style={{ fontSize: 12, color: "#555" }}>上位3つ（高い順）</div>
                    <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
                      {top3.length ? (
                        top3.map((t) => (
                          <div key={t.key} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <span>{t.label}</span>
                            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{t.score.toFixed(1)}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: "#666" }}>（スコア情報がありません）</div>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: 14, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fbfbfb" }}>
                    <div style={{ fontSize: 12, color: "#555" }}>6項目スコア一覧</div>
                    <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
                      {(Object.keys(DIMENSION_LABELS) as Array<keyof DimensionRisks>).map((k) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span>{DIMENSION_LABELS[k]}</span>
                          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                            {dimensions ? formatScore((dimensions as any)[k]) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {answers ? (
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>18問回答を確認する</summary>
                <pre style={{ marginTop: 10, fontSize: 12, overflowX: "auto" }}>{JSON.stringify(answers, null, 2)}</pre>
              </details>
            </div>
          ) : null}

          {debug ? (
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>debug情報を確認する</summary>
                <pre style={{ marginTop: 10, fontSize: 12, overflowX: "auto" }}>{JSON.stringify(debug, null, 2)}</pre>
              </details>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
