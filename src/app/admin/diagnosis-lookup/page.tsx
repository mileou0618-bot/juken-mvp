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
        setError((json as any)?.error || "Lookup failed");
        setLoading(false);
        return;
      }
      setResult(json);
      setLoading(false);
    } catch (e) {
      setError("Lookup failed");
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
      <h1 style={{ fontSize: 22, marginBottom: 14 }}>Diagnosis Lookup (Internal)</h1>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>diagnosisId</span>
          <input
            value={diagnosisId}
            onChange={(e) => setDiagnosisId(e.target.value)}
            placeholder="JUKEN-20260519-A8K3QZ"
            style={{ padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>adminKey</span>
          <input
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="ADMIN_LOOKUP_KEY"
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
          {loading ? "Looking up..." : "Lookup"}
        </button>
      </div>

      {error ? <p style={{ marginTop: 12, color: "#b42318" }}>{error}</p> : null}

      {result ? (
        <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
          <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
            <div style={{ fontSize: 12, color: "#555" }}>GAS status: {result.gasStatus}</div>
            {result.gas?.ok === false ? <div style={{ color: "#b42318" }}>GAS error: {result.gas.error}</div> : null}
            {result.gas?.warning ? <div style={{ color: "#7a5" }}>warning: {String(result.gas.warning)}</div> : null}
          </div>

          {diagnosis ? (
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>診断</h2>
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 14 }}>
                <div>診断ID: {diagnosis.diagnosisId}</div>
                <div>submittedAt: {diagnosis.submittedAt}</div>
                <div>name: {diagnosis.parentName}</div>
                <div>email: {diagnosis.email}</div>
                <div>diagnosisLabel: {diagnosis.diagnosisLabel}</div>
                <div>diagnosisType: {diagnosis.diagnosisType}</div>
                <div>overallRisk: {diagnosis.overallRisk}</div>
                <div>thisWeekAction: {diagnosis.thisWeekAction}</div>
                <div>language: {diagnosis.language}</div>
              </div>
            </div>
          ) : null}

          {hasRadar && dimensions ? (
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>6維度</h2>
              <div style={{ marginTop: 10 }}>
                <RiskRadarChart dimensionRisks={dimensions} />
              </div>
            </div>
          ) : null}

          {answers ? (
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>answers</h2>
              <pre style={{ marginTop: 10, fontSize: 12, overflowX: "auto" }}>{JSON.stringify(answers, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

