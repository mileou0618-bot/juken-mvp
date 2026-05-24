import { NextResponse } from "next/server";
import { APPS_SCRIPT_URL } from "@/lib/juken/appsScript";

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: Request) {
  console.log("[juken] followup request received");
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "リクエスト形式が不正です。" }, { status: 400 });
  }

  const action = body.action;
  const diagnosisId = body.diagnosisId;

  if (action !== "submitFollowup" && action !== "generateLearningPackage") {
    return NextResponse.json({ error: "action が不正です。" }, { status: 400 });
  }
  if (!isNonEmptyString(diagnosisId)) {
    return NextResponse.json({ error: "diagnosisId が不正です。" }, { status: 400 });
  }

  try {
    console.log("[juken] followup sending to GAS");
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    console.log("[juken] followup GAS status:", response.status);
    const text = await response.text().catch(() => "");
    console.log("[juken] followup GAS body:", text);
    const json = (() => {
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();

    if (!response.ok) {
      return NextResponse.json({ error: "GAS 呼び出しに失敗しました。", gasStatus: response.status, gas: json }, { status: 502 });
    }

    if (json && typeof json === "object" && json.ok === false) {
      return NextResponse.json(
        { error: String((json as any).error || "GAS 処理に失敗しました。"), gasStatus: response.status, gas: json, gasRaw: text },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, gasStatus: response.status, gas: json, gasRaw: text }, { status: 200 });
  } catch (error) {
    console.error("[juken] followup API error:", error);
    return NextResponse.json(
      { error: "GAS 呼び出しに失敗しました。", message: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
