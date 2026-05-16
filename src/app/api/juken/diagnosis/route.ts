import { NextResponse } from "next/server";
import { APPS_SCRIPT_URL } from "@/lib/juken/appsScript";
import { JUKEN_DIAGNOSIS_QUESTIONS } from "@/data/jukenDiagnosisQuestions";
import { JUKEN_RESULT_TEMPLATES, JUKEN_DIAGNOSIS_DISCLAIMER } from "@/data/jukenResultTemplates";
import type { DiagnosisType, Scores, Urgency } from "@/lib/juken/types";

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidAnswerValue(value: number) {
  return Number.isFinite(value) && value >= 1 && value <= 5;
}

const DIAGNOSIS_TYPES: DiagnosisType[] = [
  "表面努力型",
  "理解不足型",
  "速度不足型",
  "計画混乱型",
  "負荷過多型",
  "不安定型",
];

function coerceScores(scores: unknown): Scores {
  const obj = (scores && typeof scores === "object" ? (scores as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  return DIAGNOSIS_TYPES.reduce((acc, type) => {
    acc[type] = Number(obj[type] ?? 0);
    return acc;
  }, {} as Scores);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const submittedAt = body.submittedAt;
  const name = body.name;
  const email = body.email;
  const grade = body.grade;
  const cramSchool = body.cramSchool;
  const answers = body.answers;
  const scores = body.scores;
  const diagnosisType = body.diagnosisType as DiagnosisType | undefined;
  const diagnosisLabel = body.diagnosisLabel;
  const urgency = body.urgency as Urgency | undefined;
  const maxScore = body.maxScore;

  if (!isNonEmptyString(submittedAt))
    return NextResponse.json({ error: "submittedAt が不正です。" }, { status: 400 });
  if (!isNonEmptyString(name)) return NextResponse.json({ error: "お名前を入力してください。" }, { status: 400 });
  if (!isNonEmptyString(email))
    return NextResponse.json({ error: "メールアドレスを入力してください。" }, { status: 400 });
  if (!isNonEmptyString(grade)) return NextResponse.json({ error: "学年を選択してください。" }, { status: 400 });

  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "回答データが不正です。" }, { status: 400 });
  }

  if (!diagnosisType || !DIAGNOSIS_TYPES.includes(diagnosisType)) {
    return NextResponse.json({ error: "診断タイプが不正です。" }, { status: 400 });
  }

  const normalizedAnswers: Record<string, number> = {};
  for (const q of JUKEN_DIAGNOSIS_QUESTIONS) {
    const val = Number((answers as Record<string, unknown>)[q.id]);
    if (!isValidAnswerValue(val)) {
      return NextResponse.json({ error: "未回答の質問があります。" }, { status: 400 });
    }
    normalizedAnswers[q.id] = val;
  }

  const normalizedScores = coerceScores(scores);
  const template = JUKEN_RESULT_TEMPLATES[diagnosisType];

  const flatPayload: Record<string, unknown> = {
    submittedAt,
    name: String(name).trim(),
    email: String(email).trim(),
    grade: String(grade),
    cramSchool: typeof cramSchool === "string" ? cramSchool : "",
    diagnosisType,
    diagnosisLabel: isNonEmptyString(diagnosisLabel) ? String(diagnosisLabel) : template.diagnosisLabel,
    urgency: urgency ?? "低",
    maxScore: Number(maxScore ?? 0),

    // scores (final)
    "score_表面努力型": normalizedScores["表面努力型"],
    "score_理解不足型": normalizedScores["理解不足型"],
    "score_速度不足型": normalizedScores["速度不足型"],
    "score_計画混乱型": normalizedScores["計画混乱型"],
    "score_負荷過多型": normalizedScores["負荷過多型"],
    "score_不安定型": normalizedScores["不安定型"],

    // scores (final, requested english keys)
    score_surfaceEffort: normalizedScores["表面努力型"],
    score_understandingGap: normalizedScores["理解不足型"],
    score_speedGap: normalizedScores["速度不足型"],
    score_planningChaos: normalizedScores["計画混乱型"],
    score_overload: normalizedScores["負荷過多型"],
    score_instability: normalizedScores["不安定型"],
  };

  // q1..q18 (final)
  for (const q of JUKEN_DIAGNOSIS_QUESTIONS) {
    flatPayload[q.id] = normalizedAnswers[q.id];
  }

  // Email derived fields (template-derived, requested names)
  // mailDiagnosisLabel must equal diagnosisLabel (display name)
  flatPayload.mailDiagnosisLabel = String(flatPayload.diagnosisLabel);
  const compactLines = (lines: unknown) =>
    Array.isArray(lines) ? lines.map((v) => String(v)).filter((v) => v.trim().length > 0) : [];

  flatPayload.mailCurrentTrend = template.typeLine;
  flatPayload.mailProblemSummary = compactLines([...template.notEffortLines, "", ...template.continueLines]).join("\n");
  flatPayload.mailCauses = compactLines(template.notEffortLines);
  flatPayload.mailThisWeekActions = compactLines(template.continueLines);
  flatPayload.mailParentMessage = [template.lineCtaTitle, ...template.lineCtaBody].join("\n");
  flatPayload.disclaimer = JUKEN_DIAGNOSIS_DISCLAIMER;

  // Keep a compact text summary as well (optional but useful)
  flatPayload.emailSummary = compactLines([...template.notEffortLines, "", ...template.continueLines]).join(" ");

  // Compatibility fields (older GAS may rely on these)
  flatPayload.parentName = flatPayload.name;
  flatPayload.school = flatPayload.cramSchool;
  flatPayload.answers = JUKEN_DIAGNOSIS_QUESTIONS.map((q) => normalizedAnswers[q.id]);
  flatPayload.scores = normalizedScores;

  console.log("[juken] diagnosis payload", flatPayload);

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flatPayload),
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "結果の保存に失敗しました。" }, { status: 502 });
  }
}
