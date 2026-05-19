import { NextResponse } from "next/server";
import { APPS_SCRIPT_URL } from "@/lib/juken/appsScript";

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const diagnosisId = body.diagnosisId;
  const adminKey = body.adminKey;

  if (!isNonEmptyString(diagnosisId)) {
    return NextResponse.json({ error: "diagnosisId is required" }, { status: 400 });
  }

  const expected = process.env.ADMIN_LOOKUP_KEY;
  if (!expected || !isNonEmptyString(adminKey) || adminKey !== expected) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lookupDiagnosis", diagnosisId: String(diagnosisId).trim() }),
    });
    const text = await res.text().catch(() => "");
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return NextResponse.json(
      {
        ok: res.ok,
        gasStatus: res.status,
        gas: json,
        raw: json ? undefined : text,
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch (err) {
    return NextResponse.json({ error: "GAS_REQUEST_FAILED" }, { status: 502 });
  }
}

