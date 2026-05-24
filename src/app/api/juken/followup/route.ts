import { NextResponse } from "next/server";
import { APPS_SCRIPT_URL } from "@/lib/juken/appsScript";

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: Request) {
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
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text().catch(() => "");
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

    return NextResponse.json({ ok: true, gasStatus: response.status, gas: json }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "GAS 呼び出しに失敗しました。" }, { status: 502 });
  }
}

