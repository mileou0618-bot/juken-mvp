import { JUKEN_DIAGNOSIS_QUESTIONS } from "@/data/jukenDiagnosisQuestions";
import type { DimensionRisks, RiskDimensionKey, RiskDiagnosisType, RiskModelDiagnosisResult } from "@/lib/juken/types";

function questionKey(id: number) {
  return `q${id}`;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function isValidAnswerValue(value: number) {
  return Number.isFinite(value) && value >= 1 && value <= 5;
}

export function calculateDimensionRisks(answers: Record<string, number>): DimensionRisks {
  const byDimension = new Map<RiskDimensionKey, number[]>();
  for (const q of JUKEN_DIAGNOSIS_QUESTIONS) {
    const key = questionKey(q.id);
    const value = Number(answers[key]);
    if (!isValidAnswerValue(value)) {
      throw new Error(`未回答の質問があります: ${key}`);
    }
    const list = byDimension.get(q.dimension) ?? [];
    list.push(value);
    byDimension.set(q.dimension, list);
  }

  const dims: RiskDimensionKey[] = [
    "homework_load",
    "review_retention",
    "planning",
    "parent_involvement",
    "autonomy",
    "mental_load",
  ];

  const result = {} as DimensionRisks;
  for (const d of dims) {
    const values = byDimension.get(d) ?? [];
    if (values.length !== 3) throw new Error(`診断データが不正です: dimension=${d}`);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    result[d] = round1(avg);
  }
  return result;
}

export function calculateOverallRisk(dimensionRisks: DimensionRisks): number {
  const dims = Object.keys(dimensionRisks) as RiskDimensionKey[];
  const avg = dims.reduce((sum, k) => sum + Number(dimensionRisks[k]), 0) / dims.length;
  return round1(avg);
}

const DIMENSION_LABELS: Record<RiskDimensionKey, string> = {
  homework_load: "宿題負荷",
  review_retention: "復習・定着不足",
  planning: "計画・優先順位",
  parent_involvement: "親の関与",
  autonomy: "自走性",
  mental_load: "精神的負荷",
};

export function detectTopRisks(dimensionRisks: DimensionRisks): RiskModelDiagnosisResult["topRisks"] {
  const sorted = (Object.keys(dimensionRisks) as RiskDimensionKey[])
    .map((dimension) => ({
      dimension,
      label: DIMENSION_LABELS[dimension],
      score: round1(Number(dimensionRisks[dimension])),
    }))
    .sort((a, b) => b.score - a.score);

  const top: RiskModelDiagnosisResult["topRisks"] = [];
  for (const item of sorted) {
    if (top.length >= 2) break;
    top.push(item);
  }
  return top;
}

export function detectStructure(dimensionRisks: DimensionRisks): RiskModelDiagnosisResult["structure"] {
  const scores = (Object.keys(dimensionRisks) as RiskDimensionKey[]).map((k) => Number(dimensionRisks[k]));
  const countHigh = scores.filter((v) => v >= 4.0).length;
  const top = detectTopRisks(dimensionRisks);

  if (countHigh >= 3) {
    return { kind: "overall", summary: "全体的に負荷が高く、家庭学習が崩れやすい状態です。" };
  }
  if ((top[0]?.score ?? 0) >= 3.7 && (top[1]?.score ?? 0) >= 3.7) {
    return { kind: "dual", summary: "複数のズレが重なり、回しづらさが出やすい状態です。" };
  }
  return { kind: "single", summary: "いまは一番負荷の高い部分から整えるのが効果的です。" };
}

export function detectDiagnosisType(dimensionRisks: DimensionRisks, overallRisk: number): RiskDiagnosisType {
  const dims = dimensionRisks;
  const countHigh = (Object.keys(dims) as RiskDimensionKey[]).filter((k) => Number(dims[k]) >= 4.0).length;

  // Priority order must be fixed.
  if (overallRisk < 2.4) return "安定運用型";
  if (dims.homework_load >= 4.0 && dims.mental_load >= 4.0) return "負荷過多型";
  if (countHigh >= 3) return "不安定型";
  if (dims.parent_involvement >= 4.0 && dims.autonomy >= 3.8) return "親主導型";
  if (dims.review_retention >= 4.0 && dims.homework_load >= 3.5) return "表面努力型";
  if (dims.planning >= 4.0) return "計画不明型";
  return "要観察型";
}

export function buildDiagnosisResult(answers: Record<string, number>): RiskModelDiagnosisResult {
  const dimensionRisks = calculateDimensionRisks(answers);
  const overallRisk = calculateOverallRisk(dimensionRisks);
  const type = detectDiagnosisType(dimensionRisks, overallRisk);
  const topRisks = detectTopRisks(dimensionRisks);
  const structure = detectStructure(dimensionRisks);

  return {
    type,
    overallRisk,
    dimensionRisks,
    topRisks,
    structure,
  };
}

