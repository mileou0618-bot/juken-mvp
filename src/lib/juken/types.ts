export type DiagnosisType =
  | "表面努力型"
  | "理解不足型"
  | "速度不足型"
  | "計画混乱型"
  | "負荷過多型"
  | "不安定型";

export type Urgency = "低" | "中" | "高";

export type RiskDimensionKey =
  | "homework_load"
  | "review_retention"
  | "planning"
  | "parent_involvement"
  | "autonomy"
  | "mental_load";

export type RiskDiagnosisType =
  | "安定運用型"
  | "負荷過多型"
  | "不安定型"
  | "親主導型"
  | "表面努力型"
  | "計画不明型"
  | "要観察型";

export type Question = {
  id: number;
  text: string;
  dimension: RiskDimensionKey;
  weight: 1;
};

export type Scores = Record<DiagnosisType, number>;

export type DiagnosisResult = {
  scores: Scores;
  diagnosisType: DiagnosisType;
  urgency: Urgency;
  maxScore: number;
};

export type DimensionRisks = Record<RiskDimensionKey, number>;

export type RiskModelDiagnosisResult = {
  type: RiskDiagnosisType;
  overallRisk: number;
  dimensionRisks: DimensionRisks;
  topRisks: Array<{ dimension: RiskDimensionKey; label: string; score: number }>;
  structure: { kind: "single" | "dual" | "overall"; summary: string };
};

export type Profile = {
  name: string;
  email: string;
  grade: string;
  cramSchool?: string;
};

export type StoredDiagnosisResult = {
  diagnosisId?: string;
  profile: Profile;
  answers: Record<string, number>;
  scores: Scores;
  diagnosisType: DiagnosisType;
  urgency: Urgency;
  maxScore: number;
  riskModel?: RiskModelDiagnosisResult;
  language?: "ja" | "cn";
};
