import { NextResponse } from "next/server";
import { APPS_SCRIPT_URL } from "@/lib/juken/appsScript";
import { JUKEN_DIAGNOSIS_QUESTIONS } from "@/data/jukenDiagnosisQuestions";
import { JUKEN_RESULT_TEMPLATES, JUKEN_DIAGNOSIS_DISCLAIMER } from "@/data/jukenResultTemplates";
import type { DiagnosisType, Scores, Urgency } from "@/lib/juken/types";
import { getResultDisplay } from "@/lib/juken/resultDisplayMap";

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidAnswerValue(value: number) {
  return Number.isFinite(value) && value >= 1 && value <= 5;
}

function generateDiagnosisId(submittedAtIso: string) {
  const date = new Date(submittedAtIso);
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `JUKEN-${yyyy}${mm}${dd}-${suffix}`;
}

function normalizeMailLine(text: unknown) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([、。])/g, "$1")
    .trim();
}

function safeString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

type RiskModelPayload = {
  type?: unknown;
  topRisks?: unknown;
  dimensionRisks?: unknown;
  overallRisk?: unknown;
  structure?: unknown;
};

function compactLines(lines: unknown) {
  return Array.isArray(lines) ? lines.map((v) => String(v)).filter((v) => v.trim().length > 0) : [];
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
  console.log("[juken] diagnosis request received");
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const submittedAt = body.submittedAt;
  const language = body.language;
  const diagnosisId = body.diagnosisId;
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
  const riskModel = body.riskModel;

  if (!isNonEmptyString(submittedAt))
    return NextResponse.json({ error: "submittedAt が不正です。" }, { status: 400 });
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
    const key = `q${q.id}`;
    const val = Number((answers as Record<string, unknown>)[key]);
    if (!isValidAnswerValue(val)) {
      return NextResponse.json({ error: "未回答の質問があります。" }, { status: 400 });
    }
    normalizedAnswers[key] = val;
  }

  const normalizedScores = coerceScores(scores);
  const template = JUKEN_RESULT_TEMPLATES[diagnosisType];

  const flatPayload: Record<string, unknown> = {
    submittedAt,
    language: typeof language === "string" ? language : "",
    diagnosisId: isNonEmptyString(diagnosisId) ? String(diagnosisId).trim() : generateDiagnosisId(String(submittedAt)),
    // name is optional
    name: typeof name === "string" ? name.trim() : "",
    email: String(email).trim(),
    grade: String(grade),
    cramSchool: typeof cramSchool === "string" ? cramSchool : "",
    diagnosisType,
    // Avoid leaking legacy display labels (e.g., 優先順位迷子) into mail/Sheet.
    // Keep the column but store an empty string when not explicitly provided.
    diagnosisLabel: isNonEmptyString(diagnosisLabel) ? String(diagnosisLabel) : "",
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
    const key = `q${q.id}`;
    flatPayload[key] = normalizedAnswers[key];
  }

  // Email derived fields (type-driven display; keep names for GAS compatibility)
  // NOTE: Internal type names must not be shown to end users. GAS email uses mail* fields.
  const rm = (riskModel && typeof riskModel === "object" ? (riskModel as RiskModelPayload) : null) as RiskModelPayload | null;
  const rmType = rm && typeof rm.type === "string" ? rm.type : "";
  const display = getResultDisplay(rmType);

  // Do not expose internal type names in email output.
  flatPayload.mailDiagnosisLabel = "";

  // Use the type-to-display map for mail content.
  flatPayload.mailCurrentTrend = normalizeMailLine(display.mailState);
  flatPayload.mailProblemSummary = "";
  // Send as newline-joined text (not JSON array) to be robust against older GAS templates.
  flatPayload.mailCauses = display.mailPoints.join("\n");
  flatPayload.mailThisWeekActions = normalizeMailLine(display.mailNextAction);
  flatPayload.mailParentMessage = "必要であれば、LINEで現在の状況を整理できます。";
  flatPayload.disclaimer = JUKEN_DIAGNOSIS_DISCLAIMER;

  flatPayload.emailSummary = compactLines([flatPayload.mailCurrentTrend, flatPayload.mailProblemSummary]).join(" ");

  // Compatibility fields (older GAS may rely on these)
  flatPayload.parentName = flatPayload.name;
  flatPayload.school = flatPayload.cramSchool;
  flatPayload.answers = JUKEN_DIAGNOSIS_QUESTIONS.map((q) => normalizedAnswers[`q${q.id}`]);
  flatPayload.scores = normalizedScores;

  // Optional: risk model fields (kept compatible; GAS/Sheet may ignore unless headers added).
  if (riskModel && typeof riskModel === "object") {
    const rm = riskModel as Record<string, unknown>;
    flatPayload.riskModelType = typeof rm.type === "string" ? rm.type : "";
    flatPayload.riskOverallRisk = Number(rm.overallRisk ?? 0);
    flatPayload.riskDimensionRisks = safeString(rm.dimensionRisks);
    flatPayload.riskTopRisks = safeString(rm.topRisks);
    flatPayload.riskStructure = safeString(rm.structure);

    // Flattened dimension risks for Sheet lookup / radar reuse.
    const dims = (rm.dimensionRisks && typeof rm.dimensionRisks === "object" ? (rm.dimensionRisks as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    flatPayload.overallRisk = Number(rm.overallRisk ?? 0);
    flatPayload.homework_load = Number(dims.homework_load ?? 0);
    flatPayload.review_retention = Number(dims.review_retention ?? 0);
    flatPayload.planning = Number(dims.planning ?? 0);
    flatPayload.parent_involvement = Number(dims.parent_involvement ?? 0);
    flatPayload.autonomy = Number(dims.autonomy ?? 0);
    flatPayload.mental_load = Number(dims.mental_load ?? 0);
  }

  // Stable JSON for lookups.
  flatPayload.answersJson = safeString(normalizedAnswers);
  flatPayload.thisWeekAction = normalizeMailLine(display.mailNextAction);

  console.log("[juken] diagnosis payload", flatPayload);

  try {
    console.log("[juken] sending to GAS");
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flatPayload),
    });
    console.log("[juken] GAS status:", response.status);
    const responseText = await response.text().catch(() => "");
    console.log("[juken] GAS body:", responseText);
    const gasJson = (() => {
      try {
        return JSON.parse(responseText) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    if (gasJson) {
      console.log("[juken] GAS parsed:", {
        sheetOk: gasJson.sheetOk,
        sheetError: gasJson.sheetError,
        mailOk: gasJson.mailOk,
        mailError: gasJson.mailError,
      });
    }
    return NextResponse.json(
      {
        ok: true,
        gas: gasJson,
        gasStatus: response.status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[juken] API error:", error);
    return NextResponse.json({ error: "結果の保存に失敗しました。" }, { status: 502 });
  }
}
