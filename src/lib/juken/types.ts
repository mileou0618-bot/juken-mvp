export type DiagnosisType =
  | "表面努力型"
  | "理解不足型"
  | "速度不足型"
  | "計画混乱型"
  | "負荷過多型"
  | "不安定型";

export type Urgency = "低" | "中" | "高";

export type Question = {
  id: string;
  type: DiagnosisType;
  text: string;
};

export type Scores = Record<DiagnosisType, number>;

export type DiagnosisResult = {
  scores: Scores;
  diagnosisType: DiagnosisType;
  urgency: Urgency;
  maxScore: number;
};

export type Profile = {
  name: string;
  email: string;
  grade: string;
  cramSchool?: string;
};

export type StoredDiagnosisResult = {
  profile: Profile;
  answers: Record<string, number>;
  scores: Scores;
  diagnosisType: DiagnosisType;
  urgency: Urgency;
  maxScore: number;
};

