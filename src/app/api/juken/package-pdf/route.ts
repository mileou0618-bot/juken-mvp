import { NextResponse } from "next/server";
import { APPS_SCRIPT_URL } from "@/lib/juken/appsScript";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    const diagnosisId = String(body?.diagnosisId || "").trim();
    if (!diagnosisId) {
      return NextResponse.json({ ok: false, error: "diagnosisId_required" }, { status: 400 });
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generatePackagePdf",
        diagnosisId,
      }),
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { ok: false, error: "invalid_gas_response", raw: text };
    }

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "gas_error", gasStatus: res.status, gas: json }, { status: 502 });
    }

    return NextResponse.json({ ok: true, gasStatus: res.status, gas: json });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "server_error", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

