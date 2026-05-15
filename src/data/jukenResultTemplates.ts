import type { DiagnosisType } from "@/lib/juken/types";

export type JukenResultTemplate = {
  title: string;
  diagnosisLabel: string;
  problemSummary: string;
  currentTrend: {
    homework: string;
    understanding: string;
    priority: string;
  };
  visibleMessage: string;
  causes: string[];
  thisWeekActions: string[];
  parentMessage: string;
  ctaLead: string;
  emailSummary: string;
};

export const JUKEN_RESULT_TEMPLATES: Record<DiagnosisType, JukenResultTemplate> = {
  表面努力型: {
    title: "表面努力型",
    diagnosisLabel: "宿題処理型",
    problemSummary: "宿題はやっているのに、なぜ点数につながらないのか。",
    currentTrend: { homework: "できている", understanding: "不足しやすい", priority: "高い" },
    visibleMessage: "このままでは、やった量のわりに結果が動きにくい状態が続きます。",
    causes: [
      "丸つけ・直しが「答え合わせ」で止まり、翌日に解き直していない",
      "間違えた問題の「理由」が言語化されず、同じミスが残っている",
      "「できるようになったか」を確認する工程が不足している",
    ],
    thisWeekActions: [
      "宿題の後に「間違えた問題を3問だけ」選ぶ",
      "翌日にその3問だけ解き直す（丸暗記の写しはNG）",
      "親は「昨日の3問、今日はできた？」だけ確認する",
    ],
    parentMessage: "昨日間違えた問題、今日はできた？",
    ctaLead: "今週は「解き直しの固定」だけ入れてみましょう。",
    emailSummary: "宿題は進んでいますが、解き直しと定着確認が不足している可能性があります。翌日の解き直しを固定してください。",
  },
  理解不足型: {
    title: "理解不足型",
    diagnosisLabel: "理解確認不足型",
    problemSummary: "分かったつもりで止まっている状態です。",
    currentTrend: { homework: "進んでいる", understanding: "不足している", priority: "高い" },
    visibleMessage: "このままでは、解けるはずの問題でも本番で再現できず崩れやすくなります。",
    causes: [
      "解説を読んだ直後の理解で止まり、翌日に自力で再現する工程がない",
      "「なぜその式/手順になるか」を短い言葉で説明できていない",
      "間違いの原因が「計算ミス/ミスした」で終わり、次の手が打てていない",
    ],
    thisWeekActions: [
      "解き直し後に「一言でどう考えた？」を言わせる",
      "説明できない問題は“未理解”として翌日にもう一度回す",
      "親は正解より「説明できたか」だけチェックする",
    ],
    parentMessage: "なぜその解き方になるの？",
    ctaLead: "今週は「説明できるか」を基準にしてみましょう。",
    emailSummary: "理解したつもりのまま進んでいる可能性があります。解き直し後に考え方を一言で説明できるか確認してください。",
  },
  速度不足型: {
    title: "速度不足型",
    diagnosisLabel: "時間不足型",
    problemSummary: "時間内に解き切れない状態です。",
    currentTrend: { homework: "進んでいる", understanding: "ある程度できている", priority: "中" },
    visibleMessage: "このままでは、理解があっても“最後まで到達しない”状態が続きやすくなります。",
    causes: [
      "計算・漢字・語句などの基礎処理が遅く、時間を食っている",
      "時間を測らずに演習し、スピードの基準が育っていない",
      "解く順番や着手が遅く、最初の数問で詰まりやすい",
    ],
    thisWeekActions: [
      "毎日10分だけ、必ずタイマーで測って基礎処理を回す",
      "“速さ”と“正答率”をセットで記録（メモでOK）",
      "詰まりやすい単元は「最初の1問だけ」先に解く練習をする",
    ],
    parentMessage: "昨日より少し速く、でも正確にできた？",
    ctaLead: "今週は「時間を測る」だけで改善が出やすいです。",
    emailSummary: "理解だけでなく、時間内に処理する練習が必要です。短時間の計測習慣を作ってください。",
  },
  計画混乱型: {
    title: "計画混乱型",
    diagnosisLabel: "優先順位迷子型",
    problemSummary: "何からやるかが毎日ブレている状態です。",
    currentTrend: { homework: "不安定", understanding: "確認不足", priority: "高い" },
    visibleMessage: "このままでは、宿題に追われて「直し・復習・暗記」が後回しになりやすくなります。",
    causes: [
      "やることを全部同じ重要度で扱い、毎日の選択で迷っている",
      "学習の順番が固定されず、日によって抜けや偏りが出る",
      "親と子で“優先すること”がズレて、摩擦が起きやすい",
    ],
    thisWeekActions: [
      "今週は毎日の学習を「3つだけ」に固定する",
      "順番は「塾の宿題 → 間違い直し → 暗記/基礎確認」に固定する",
      "最初にやるものを親子で1分で決めてから始める",
    ],
    parentMessage: "今日は何を先にやる？",
    ctaLead: "今週は「順番の固定」だけで崩れにくくなります。",
    emailSummary: "やることの順番が整理されていないため家庭学習が崩れやすい状態です。毎日の順番を固定してください。",
  },
  負荷過多型: {
    title: "負荷過多型",
    diagnosisLabel: "親子摩耗型",
    problemSummary: "量が多すぎて回っていない状態です。",
    currentTrend: { homework: "多すぎる", understanding: "後回し", priority: "非常に高い" },
    visibleMessage: "このままでは、親子ともに疲れが蓄積し、学習の継続が難しくなります。",
    causes: [
      "宿題量が家庭の処理能力を超え、毎日が消化試合になっている",
      "睡眠・休憩を削って帳尻合わせをし、回復が追いついていない",
      "重要な復習や弱点補強が、常に後回しになっている",
    ],
    thisWeekActions: [
      "今週は「全部やる前提」をやめる（優先度で選ぶ）",
      "“絶対に落とさない課題”を親子で決め、そこだけ守る",
      "睡眠時間を最優先に固定し、削らない",
    ],
    parentMessage: "この量は本当に今の家庭で回せる？",
    ctaLead: "今週は「守る範囲を決める」ことが最優先です。",
    emailSummary: "課題量が多すぎて重要な復習が後回しになっている可能性があります。優先度で範囲を決め、睡眠を守ってください。",
  },
  不安定型: {
    title: "不安定型",
    diagnosisLabel: "不安先行型",
    problemSummary: "日によって学習が崩れる状態です。",
    currentTrend: { homework: "日によって差がある", understanding: "安定しにくい", priority: "中" },
    visibleMessage: "このままでは、テスト前だけ頑張る学習になりやすく、普段の積み上げが弱くなります。",
    causes: [
      "開始時刻が決まっておらず、着手が日によって遅れる",
      "最初にやることが毎日変わり、集中に入るまで時間がかかる",
      "親の声かけに依存し、声かけがない日は動き出しにくい",
    ],
    thisWeekActions: [
      "開始時刻を固定する（毎日同じ時刻）",
      "最初の10分でやる“小さな課題”を固定する",
      "親の声かけは「始めた？」ではなく「最初の10分できた？」にする",
    ],
    parentMessage: "今日も同じ時間に始められた？",
    ctaLead: "今週は「開始の型」を作るのが近道です。",
    emailSummary: "学習の開始と流れが安定していないため日によって崩れやすい状態です。開始時刻と最初の10分を固定してください。",
  },
};

export const JUKEN_DIAGNOSIS_DISCLAIMER =
  "本診断は家庭学習の管理状況を整理するための簡易診断です。学力・成績・合格可能性を保証するものではありません。";
