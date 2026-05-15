import { calculateJukenDiagnosis } from "@/lib/juken/calculateDiagnosis";
import { JUKEN_RESULT_TEMPLATES } from "@/data/jukenResultTemplates";

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
  const cases: Array<{
    name: string;
    mutate: (a: Record<string, number>) => void;
    expectedType: string;
    expectedLabel: string;
  }> = [
    { name: "表面努力型", mutate: (a: Record<string, number>) => setRange(a, 1, 3, 5), expectedType: "表面努力型" },
    { name: "理解不足型", mutate: (a: Record<string, number>) => setRange(a, 4, 6, 5), expectedType: "理解不足型" },
    { name: "速度不足型", mutate: (a: Record<string, number>) => setRange(a, 7, 9, 5), expectedType: "速度不足型" },
    { name: "計画混乱型", mutate: (a: Record<string, number>) => setRange(a, 10, 12, 5), expectedType: "計画混乱型" },
    { name: "負荷過多型", mutate: (a: Record<string, number>) => setRange(a, 13, 15, 5), expectedType: "負荷過多型" },
    { name: "不安定型", mutate: (a: Record<string, number>) => setRange(a, 16, 18, 5), expectedType: "不安定型" },
  ].map((c) => ({
    ...c,
    expectedLabel: JUKEN_RESULT_TEMPLATES[c.expectedType as keyof typeof JUKEN_RESULT_TEMPLATES].diagnosisLabel,
  }));

  for (const c of cases) {
    const answers = baseAnswers();
    c.mutate(answers);
    const res = calculateJukenDiagnosis(answers);
    assertEqual(res.diagnosisType, c.expectedType, `diagnosisType(${c.name})`);
    assertEqual(res.maxScore, 15, `maxScore(${c.name})`);
    assertEqual(res.urgency, "高", `urgency(${c.name})`);
    assertEqual(
      JUKEN_RESULT_TEMPLATES[res.diagnosisType as keyof typeof JUKEN_RESULT_TEMPLATES].diagnosisLabel,
      c.expectedLabel,
      `diagnosisLabel(${c.name})`
    );
  }

  // Tie-break: same maxScore between 理解不足型 and 負荷過多型 => 負荷過多型 wins.
  {
    const answers = baseAnswers();
    setRange(answers, 4, 6, 5); // 理解不足型 15
    setRange(answers, 13, 15, 5); // 負荷過多型 15
    const res = calculateJukenDiagnosis(answers);
    assertEqual(res.diagnosisType, "負荷過多型", "tie-break(負荷過多型優先)");
  }

  // Urgency middle/low
  {
    const answers = baseAnswers();
    setRange(answers, 7, 9, 3); // 速度不足型 score=9
    const res = calculateJukenDiagnosis(answers);
    assertEqual(res.diagnosisType, "速度不足型", "mid-score type");
    assertEqual(res.maxScore, 9, "mid-score maxScore");
    assertEqual(res.urgency, "低", "mid-score urgency");
  }

  // Missing answers should throw
  {
    const answers = baseAnswers();
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete answers.q1;
    let threw = false;
    try {
      calculateJukenDiagnosis(answers);
    } catch {
      threw = true;
    }
    assertEqual(threw, true, "missing answers throws");
  }

  console.log("[OK] juken diagnosis engine smoke tests passed");
}

run();
