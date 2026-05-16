import type { Question } from "@/lib/juken/types";

export const JUKEN_DIAGNOSIS_QUESTIONS: Question[] = [
  // 宿題負荷（homework_load）
  {
    id: 1,
    dimension: "homework_load",
    weight: 1,
    text: "塾の宿題が多く、時間内に終わらないことが多い。",
  },
  {
    id: 2,
    dimension: "homework_load",
    weight: 1,
    text: "宿題を終わらせるだけで精一杯になっている。",
  },
  {
    id: 3,
    dimension: "homework_load",
    weight: 1,
    text: "解き直しや復習まで手が回らないことが多い。",
  },

  // 復習・定着不足（review_retention）
  {
    id: 4,
    dimension: "review_retention",
    weight: 1,
    text: "塾の宿題は終わっているのに、テストで同じような問題を間違えることが多い。",
  },
  {
    id: 5,
    dimension: "review_retention",
    weight: 1,
    text: "授業や解説を聞いた直後は分かったと言うが、翌日には解けないことがある。",
  },
  {
    id: 6,
    dimension: "review_retention",
    weight: 1,
    text: "解けた問題でも、「どう考えたか」を聞くと説明があいまいになることがある。",
  },

  // 計画・優先順位の曖昧さ（planning）
  {
    id: 7,
    dimension: "planning",
    weight: 1,
    text: "その日に何を優先してやるべきか、親子で迷うことが多い。",
  },
  {
    id: 8,
    dimension: "planning",
    weight: 1,
    text: "学習予定を立てても、数日で崩れてしまう。",
  },
  {
    id: 9,
    dimension: "planning",
    weight: 1,
    text: "重要な復習や弱点補強が、宿題に追われて後回しになっている。",
  },

  // 親の関与過多（parent_involvement）
  {
    id: 10,
    dimension: "parent_involvement",
    weight: 1,
    text: "親が声をかけないと、学習が始まらないことが多い。",
  },
  {
    id: 11,
    dimension: "parent_involvement",
    weight: 1,
    text: "学習の進め方を、子どもより親が決める場面が多い。",
  },
  {
    id: 12,
    dimension: "parent_involvement",
    weight: 1,
    text: "子ども任せにすると、学習が止まってしまう不安がある。",
  },

  // 自走性の不足（autonomy）
  {
    id: 13,
    dimension: "autonomy",
    weight: 1,
    text: "間違えた問題について、なぜ間違えたのかを自分で整理できていない。",
  },
  {
    id: 14,
    dimension: "autonomy",
    weight: 1,
    text: "指示がないと、次に何をやるべきか決められないことが多い。",
  },
  {
    id: 15,
    dimension: "autonomy",
    weight: 1,
    text: "自分で学習内容を振り返り、改善することが苦手に見える。",
  },

  // 精神的負荷（mental_load）
  {
    id: 16,
    dimension: "mental_load",
    weight: 1,
    text: "学習のことで、親子ともに疲れている感覚がある。",
  },
  {
    id: 17,
    dimension: "mental_load",
    weight: 1,
    text: "テスト前になると、家庭内の緊張感が強くなる。",
  },
  {
    id: 18,
    dimension: "mental_load",
    weight: 1,
    text: "日によって集中力や学習量の差が大きく、リズムが安定しない。",
  },
];

