import { buildDiagnosisResult } from "@/lib/jukenDiagnosisEngine";

function baseAnswers() {
  const answers: Record<string, number> = {};
  for (let i = 1; i <= 18; i += 1) answers[`q${i}`] = 1;
  return answers;
}

function setRange(answers: Record<string, number>, from: number, to: number, value: number) {
  for (let i = from; i <= to; i += 1) answers[`q${i}`] = value;
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${label}: expected=${String(expected)} actual=${String(actual)}`);
  }
}

function run() {
  // Phase 2: 6-dimension risk model extreme cases
  // Case A: all 1 => 安定運用型
  {
    const answers = baseAnswers();
    const res = buildDiagnosisResult(answers);
    assertEqual(res.type, "安定運用型", "Case A (all=1)");
  }

  // Case B: all 5 => 負荷過多型
  {
    const answers = baseAnswers();
    setRange(answers, 1, 18, 5);
    const res = buildDiagnosisResult(answers);
    assertEqual(res.type, "負荷過多型", "Case B (all=5)");
  }

  // Case C: Q1-Q3 high, Q4-Q6 high => 表面努力型
  {
    const answers = baseAnswers();
    setRange(answers, 1, 3, 5);
    setRange(answers, 4, 6, 5);
    // Avoid overallRisk < 2.4 (安定運用型) by raising other dimensions slightly.
    setRange(answers, 7, 18, 2);
    const res = buildDiagnosisResult(answers);
    assertEqual(res.type, "表面努力型", "Case C (homework+review high)");
  }

  // Case D: Q10-Q12 high, Q13-Q15 high => 親主導型
  {
    const answers = baseAnswers();
    setRange(answers, 10, 12, 5);
    setRange(answers, 13, 15, 5);
    setRange(answers, 1, 9, 2);
    setRange(answers, 16, 18, 2);
    const res = buildDiagnosisResult(answers);
    assertEqual(res.type, "親主導型", "Case D (parent+autonomy high)");
  }

  // Case E: >=3 dimensions >=4.0 => 不安定型 (unless overload condition triggers)
  {
    const answers = baseAnswers();
    // Make homework_load, planning, autonomy averages >= 4.0
    setRange(answers, 1, 3, 4);
    setRange(answers, 7, 9, 4);
    setRange(answers, 13, 15, 4);
    const res = buildDiagnosisResult(answers);
    assertEqual(res.type, "不安定型", "Case E (>=3 dims high => 不安定型)");
  }

  // Case E (priority): if homework_load>=4.0 && mental_load>=4.0 => 負荷過多型 wins
  {
    const answers = baseAnswers();
    setRange(answers, 1, 3, 5); // homework_load=5.0
    setRange(answers, 16, 18, 5); // mental_load=5.0
    setRange(answers, 7, 9, 5); // also high, would qualify for 不安定型 too
    const res = buildDiagnosisResult(answers);
    assertEqual(res.type, "負荷過多型", "Case E priority (overload wins)");
  }

  // Case F: Q7-Q9 high => 計画不明型
  {
    const answers = baseAnswers();
    setRange(answers, 7, 9, 5);
    setRange(answers, 1, 6, 2);
    setRange(answers, 10, 18, 2);
    const res = buildDiagnosisResult(answers);
    assertEqual(res.type, "計画不明型", "Case F (planning high)");
  }

  // Missing answers should throw
  {
    const answers = baseAnswers();
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete answers.q1;
    let threw = false;
    try {
      buildDiagnosisResult(answers);
    } catch {
      threw = true;
    }
    assertEqual(threw, true, "missing answers throws");
  }

  console.log("[OK] Phase 2 risk model smoke tests passed");
}

run();
