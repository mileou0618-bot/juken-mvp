import type { DiagnosisResult, DiagnosisType, Scores, Urgency } from "@/lib/juken/types";
import { JUKEN_DIAGNOSIS_QUESTIONS } from "@/data/jukenDiagnosisQuestions";

const DIAGNOSIS_TYPES: DiagnosisType[] = [
  "表面努力型",
  "理解不足型",
  "速度不足型",
  "計画混乱型",
  "負荷過多型",
  "不安定型",
];

const TIE_BREAK_ORDER: DiagnosisType[] = [
  "負荷過多型",
  "不安定型",
  "計画混乱型",
  "理解不足型",
  "速度不足型",
  "表面努力型",
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

  const scores = DIAGNOSIS_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Scores);

  for (const q of JUKEN_DIAGNOSIS_QUESTIONS) {
    const raw = answers[q.id];
    const value = Number(raw);
    if (!isValidAnswerValue(value)) missing.push(q.id);
    else scores[q.type] += value;
  }

  if (missing.length > 0) {
    throw new Error(`未回答の質問があります: ${missing.join(", ")}`);
  }

  const maxScore = Math.max(...TIE_BREAK_ORDER.map((type) => scores[type]));
  const diagnosisType =
    TIE_BREAK_ORDER.find((type) => scores[type] === maxScore) ?? TIE_BREAK_ORDER[0];

  return {
    scores,
    diagnosisType,
    urgency: urgencyFromMaxScore(maxScore),
    maxScore,
  };
}

