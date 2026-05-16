import type { DiagnosisResult, DiagnosisType, Scores, Urgency } from "@/lib/juken/types";
import { JUKEN_DIAGNOSIS_QUESTIONS } from "@/data/jukenDiagnosisQuestions";
import { buildDiagnosisResult } from "@/lib/jukenDiagnosisEngine";

const DIAGNOSIS_TYPES: DiagnosisType[] = [
  "表面努力型",
  "理解不足型",
  "速度不足型",
  "計画混乱型",
  "負荷過多型",
  "不安定型",
];

function isValidAnswerValue(value: number) {
  return Number.isFinite(value) && value >= 1 && value <= 5;
}

function urgencyFromMaxScore(maxScore: number): Urgency {
  if (maxScore >= 13) return "高";
  if (maxScore >= 10) return "中";
  return "低";
}

export function calculateJukenDiagnosis(answers: Record<string, number>): DiagnosisResult {
  const missing: string[] = [];
  for (const q of JUKEN_DIAGNOSIS_QUESTIONS) {
    const key = `q${q.id}`;
    const value = Number(answers[key]);
    if (!isValidAnswerValue(value)) missing.push(key);
  }
  if (missing.length > 0) throw new Error(`未回答の質問があります: ${missing.join(", ")}`);

  const risk = buildDiagnosisResult(answers);

  const scores = DIAGNOSIS_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Scores);

  // Keep legacy score fields for Sheet/GAS compatibility (3 questions each, 3..15).
  // Map new 6-dimension groups to existing 6 legacy keys (display templates remain unchanged).
  const sum = (from: number, to: number) => {
    let total = 0;
    for (let i = from; i <= to; i += 1) total += Number(answers[`q${i}`]);
    return total;
  };
  scores["負荷過多型"] = sum(1, 3); // homework_load
  scores["表面努力型"] = sum(4, 6); // review_retention
  scores["計画混乱型"] = sum(7, 9); // planning
  scores["不安定型"] = sum(10, 12); // parent_involvement
  scores["理解不足型"] = sum(13, 15); // autonomy
  scores["速度不足型"] = sum(16, 18); // mental_load

  const diagnosisType: DiagnosisType = (() => {
    switch (risk.type) {
      case "負荷過多型":
        return "負荷過多型";
      case "不安定型":
        return "不安定型";
      case "表面努力型":
        return "表面努力型";
      case "計画不明型":
        return "計画混乱型";
      case "親主導型":
        return "不安定型";
      case "安定運用型":
        return "表面努力型";
      case "要観察型":
      default:
        return "計画混乱型";
    }
  })();

  const maxScore = scores[diagnosisType];

  return {
    scores,
    diagnosisType,
    urgency: urgencyFromMaxScore(maxScore),
    maxScore,
  };
}
