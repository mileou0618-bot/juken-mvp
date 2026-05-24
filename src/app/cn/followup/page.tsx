import FollowupClient from "./FollowupClient";

export default async function CnFollowupPage({
  searchParams,
}: {
  searchParams?: Promise<{ diagnosisId?: string | string[] }>;
}) {
  const resolved = await searchParams;
  const raw =
    typeof resolved?.diagnosisId === "string"
      ? resolved.diagnosisId
      : Array.isArray(resolved?.diagnosisId)
        ? resolved?.diagnosisId[0]
        : "";

  return <FollowupClient initialDiagnosisId={(raw || "").trim()} />;
}
