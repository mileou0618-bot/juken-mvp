import type { RiskDimensionKey, RiskModelDiagnosisResult } from "@/lib/juken/types";

const DIMENSION_LABELS: Record<RiskDimensionKey, string> = {
  homework_load: "宿題負荷",
  review_retention: "復習・定着不足",
  planning: "計画・優先順位",
  parent_involvement: "親の関与過多",
  autonomy: "自走性不足",
  mental_load: "精神的負荷",
};

const HERO_BY_PAIR: Array<{
  dims: [RiskDimensionKey, RiskDimensionKey];
  title: string;
}> = [
  {
    dims: ["review_retention", "planning"],
    title: "復習と優先順位が、\n後回しになりやすい状態です",
  },
  {
    dims: ["parent_involvement", "autonomy"],
    title: "親が支え続けないと、\n学習が回りにくい状態です",
  },
  {
    dims: ["homework_load", "mental_load"],
    title: "家庭学習の負荷が、\nかなり高くなっています",
  },
];

function samePair(a: [RiskDimensionKey, RiskDimensionKey], b: [RiskDimensionKey, RiskDimensionKey]) {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

export function buildHeroTitle(model: RiskModelDiagnosisResult): string {
  if (model.type === "安定運用型") {
    return "現在の家庭学習は、\n比較的安定して回っています";
  }

  if (model.type === "負荷過多型") {
    return "家庭学習全体の負荷が、\nかなり高い状態です";
  }

  if (model.type === "親主導型") {
    return "親が支え続けないと、\n学習が回りにくい状態です";
  }

  if (model.type === "計画不明型") {
    return "復習と優先順位が、\n後回しになりやすい状態です";
  }

  const dims = (model.topRisks ?? []).slice(0, 2).map((t) => t.dimension) as RiskDimensionKey[];
  if (dims.length === 2) {
    for (const entry of HERO_BY_PAIR) {
      if (samePair(entry.dims, [dims[0], dims[1]])) return entry.title;
    }
  }

  // Fallback: use the top-1 dimension only.
  const top1 = dims[0];
  if (top1) {
    switch (top1) {
      case "review_retention":
        return "復習が回りにくく、\n定着が後ろに流れています";
      case "planning":
        return "やることが増える中で、\n優先順位が決まりにくい状態です";
      case "parent_involvement":
        return "声かけや確認が増え、\n家庭の負担が上がりやすい状態です";
      case "autonomy":
        return "自分で整理して進める場面が少なく、\n学習が止まりやすい状態です";
      case "homework_load":
        return "宿題の回し方が厳しくなり、\n余白が減っています";
      case "mental_load":
        return "家庭内の緊張や疲れが残りやすく、\n学習が重くなっています";
      default:
        break;
    }
  }

  // Final fallback
  return "家庭学習の回し方に、\n負荷が出始めています";
}

function topRiskSentence(topRisks: RiskModelDiagnosisResult["topRisks"]) {
  const labels = (topRisks ?? [])
    .map((t) => DIMENSION_LABELS[t.dimension])
    .filter(Boolean)
    .slice(0, 2);

  if (labels.length >= 2) {
    return `今回の回答では、特に\n『${labels[0]}』と『${labels[1]}』の傾向が強く出ています。`;
  }
  if (labels.length === 1) {
    return `今回の回答では、特に\n『${labels[0]}』の傾向が強く出ています。`;
  }
  return "今回の回答では、いくつかの項目に傾向が出ています。";
}

function explainNowByDimension(dimension: RiskDimensionKey): string[] {
  switch (dimension) {
    case "review_retention":
      return [
        "今は「終わらせること」が優先になって、",
        "解き直しや理解の整理が後ろに流れやすい状態です。",
      ];
    case "planning":
      return [
        "やること自体は見えているのに、",
        "「何から先に」が決まりにくくなっている可能性があります。",
      ];
    case "parent_involvement":
      return [
        "声かけや確認が増えて、",
        "家庭側が「回すための力」を使いやすい状態です。",
      ];
    case "autonomy":
      return [
        "一人で次の手順を決めたり、間違いを整理したりする場面で、",
        "手が止まりやすくなっている可能性があります。",
      ];
    case "homework_load":
      return [
        "時間の余白が減って、",
        "直しや復習に戻る前に次へ進みやすくなっています。",
      ];
    case "mental_load":
      return [
        "家庭内の緊張や疲れが溜まりやすく、",
        "学習が重く感じやすい状態です。",
      ];
    default:
      return [];
  }
}

export function buildNowHappeningCopy(model: RiskModelDiagnosisResult): string[] {
  const lines: string[] = [];
  lines.push(topRiskSentence(model.topRisks));
  lines.push("");

  const topDims = (model.topRisks ?? []).slice(0, 2).map((t) => t.dimension);
  for (const d of topDims) {
    const part = explainNowByDimension(d);
    if (part.length > 0) {
      lines.push(...part);
      lines.push("");
    }
  }

  // Light touch: classification appears only at the end.
  if (model.type === "安定運用型") {
    lines.push("現時点では、家庭学習の大きな崩れは少ない状態です。");
    lines.push("今の状態を維持できているかを、定期的に確認していくことが大切です。");
    return lines;
  }

  lines.push(`この状態は、診断上は『${model.type}』に近い傾向です。`);
  return lines;
}

function explainContinueByDimension(dimension: RiskDimensionKey): string[] {
  switch (dimension) {
    case "review_retention":
      return [
        "「終わらせること」が優先され続けると、",
        "同じ単元を何度もやり直す状態になりやすくなります。",
      ];
    case "planning":
      return [
        "優先順位が決まりにくいままだと、",
        "本当に必要な復習が後回しになって、負担がじわじわ増えやすくなります。",
      ];
    case "parent_involvement":
      return [
        "親が管理し続ける時間が増えるほど、",
        "家庭内の負担差が大きくなりやすくなります。",
      ];
    case "autonomy":
      return [
        "自分で次に何をするか決める場面が少ないままだと、",
        "学年が上がったときに家庭側の支えが増えやすくなります。",
      ];
    case "homework_load":
      return [
        "宿題の余白がない状態が続くと、",
        "復習や弱点の回収が先に削られやすくなります。",
      ];
    case "mental_load":
      return [
        "緊張や疲れが続くと、",
        "学習そのものより、家庭内のやり取りにエネルギーを使いやすくなります。",
      ];
    default:
      return [];
  }
}

export function buildContinueCopy(model: RiskModelDiagnosisResult): string[] {
  if (model.type === "安定運用型") {
    return [
      "今すぐ大きく変える必要はありません。",
      "ただし、学年が上がるにつれて宿題量やテスト範囲が広がるため、",
      "今のやり方で回り続けるかを確認しておくことが大切です。",
    ];
  }

  const lines: string[] = [];
  const topDims = (model.topRisks ?? []).slice(0, 2).map((t) => t.dimension);

  for (const d of topDims) {
    const part = explainContinueByDimension(d);
    if (part.length > 0) {
      lines.push(...part);
      lines.push("");
    }
  }

  // Gentle close (no fear wording)
  lines.push("先に崩れやすい部分を1つだけでも言葉にしておくと、");
  lines.push("テスト前だけ慌てて立て直す流れになりにくくなります。");
  return lines;
}
