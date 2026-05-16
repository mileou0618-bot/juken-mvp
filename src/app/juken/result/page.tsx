"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { StoredDiagnosisResult } from "@/lib/juken/types";
import { JUKEN_RESULT_TEMPLATES, JUKEN_DIAGNOSIS_DISCLAIMER } from "@/data/jukenResultTemplates";

const SESSION_KEY = "jukenDiagnosisResult";

function safeParse(json: string): StoredDiagnosisResult | null {
  try {
    return JSON.parse(json) as StoredDiagnosisResult;
  } catch {
    return null;
  }
}

function Multiline({ text }: { text: string }) {
  const parts = String(text).split("\n");
  return (
    <>
      {parts.map((part, idx) => (
        <span key={`${idx}-${part}`}>
          {part}
          {idx < parts.length - 1 ? <br /> : null}
        </span>
      ))}
    </>
  );
}

function ResponsiveTitle({ text, isMobile }: { text: string; isMobile: boolean }) {
  const value = String(text);
  if (isMobile) return <Multiline text={value} />;
  return <>{value.replace(/\n+/g, " ")}</>;
}

function Paragraphs({ lines }: { lines: string[] }) {
  const cleaned = (lines ?? []).map((l) => String(l).trim()).filter((l) => l.length > 0);
  const paragraphs: string[] = [];
  if (cleaned.length <= 2) {
    paragraphs.push(cleaned.join(" "));
  } else if (cleaned.length <= 4) {
    paragraphs.push(cleaned.slice(0, 2).join(" "));
    paragraphs.push(cleaned.slice(2).join(" "));
  } else {
    paragraphs.push(cleaned.slice(0, 2).join(" "));
    paragraphs.push(cleaned.slice(2, 4).join(" "));
    paragraphs.push(cleaned.slice(4).join(" "));
  }

  return (
    <div className="result-paragraphs">
      {paragraphs
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .slice(0, 3)
        .map((paragraph, idx) => (
          <p key={`${idx}-${paragraph}`} className="result-paragraph">
            {paragraph}
          </p>
        ))}
    </div>
  );
}

export default function JukenResultPage() {
  const [data, setData] = useState<StoredDiagnosisResult | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    setData(raw ? safeParse(raw) : null);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const template = useMemo(() => {
    if (!data) return null;
    return JUKEN_RESULT_TEMPLATES[data.diagnosisType];
  }, [data]);

  if (!data || !template) {
    return (
      <div className="form-page">
        <main className="done-page">
          <div className="done-card">
            <h1>診断データが確認できませんでした。</h1>
            <p>お手数ですが、もう一度最初から診断をお願いいたします。</p>
            <Link href="/juken/diagnosis" className="cta light" style={{ display: "inline-block" }}>
              診断ページへ戻る
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="result-page">
      <main className="result-main">
        {/* Module 1: Result title card */}
        <section className="result-module">
          <div className="result-kicker">診断結果</div>
          <h1 className="result-title">
            <ResponsiveTitle text={template.realityTitle} isMobile={isMobile} />
          </h1>
          <p className="result-type">{template.typeLine}</p>
        </section>

        {/* Module 2: What’s happening */}
        <section className="result-module">
          <h2 className="result-h2">いま起きていること</h2>
          <Paragraphs lines={template.notEffortLines} />
        </section>

        {/* Module 3: Risks */}
        <section className="result-module result-risk">
          <h2 className="result-h2">このまま続くと、起きやすいこと</h2>
          <Paragraphs lines={template.continueLines} />
        </section>

        {/* Module 4: Fixed explanation */}
        <section className="result-module result-fixed">
          <h2 className="result-h2">家庭だけで抱え込まなくてよい理由</h2>
          <p className="result-text">
            家庭学習の問題は、お子さまの努力不足だけで起きるものではありません。
            <br />
            塾の宿題量、復習のタイミング、親の声かけ、週間スケジュールが少しずつずれることで、家庭の中だけでは整理しにくくなります。
          </p>
          <div style={{ height: 12 }} />
          <p className="result-text">
            この診断では、まず今の状態を言葉にして、どこから整えるべきかを見つけることを目的にしています。
          </p>
        </section>

        {/* Module 5: LINE CTA */}
        <section className="result-module result-cta">
          <h2 className="result-cta-title">
            「このままで大丈夫かな」と思ったら、今の状態を一度整理してみてください。
          </h2>
          <div className="result-cta-body">
            <p className="result-text">塾・学年・現在の困りごとをもとに、家庭学習の回し方を一緒に整理します。</p>
          </div>
          <div className="result-btn-row">
            <a className="result-line-btn" href="https://lin.ee/pxHFmsI" target="_blank" rel="noopener noreferrer">
              LINEで相談する
            </a>
          </div>
        </section>

        <section className="result-disclaimer">
          <p className="result-disclaimer-text">{JUKEN_DIAGNOSIS_DISCLAIMER}</p>
        </section>
      </main>
    </div>
  );
}
