import { permanentRedirect } from "next/navigation";

export default function JukenDiagnosisRedirectPage() {
  permanentRedirect("/diagnosis");
}
