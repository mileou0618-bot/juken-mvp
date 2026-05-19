import type { Question } from "@/lib/juken/types";

// Chinese copy only. Keep id/dimension/weight identical to the Japanese model.
export const CN_DIAGNOSIS_QUESTIONS: Question[] = [
  // 作业负荷（homework_load）
  { id: 1, dimension: "homework_load", weight: 1, text: "塾的作业量较多，经常无法在计划时间内完成。" },
  { id: 2, dimension: "homework_load", weight: 1, text: "每天只是完成作业就已经很吃力。" },
  { id: 3, dimension: "homework_load", weight: 1, text: "经常顾不上订正、复习和整理。" },

  // 复习与定着不足（review_retention）
  { id: 4, dimension: "review_retention", weight: 1, text: "作业明明做完了，但考试中类似问题仍然容易错。" },
  { id: 5, dimension: "review_retention", weight: 1, text: "当天听懂了，第二天又不会做。" },
  { id: 6, dimension: "review_retention", weight: 1, text: "做对的问题，也说不清自己是怎么想的。" },

  // 计划与优先级混乱（planning）
  { id: 7, dimension: "planning", weight: 1, text: "每天到底该先做什么，家长和孩子经常会迷茫。" },
  { id: 8, dimension: "planning", weight: 1, text: "学习计划即使做了，也经常几天后就乱掉。" },
  { id: 9, dimension: "planning", weight: 1, text: "重要的复习和弱点补强，经常被作业挤到后面。" },

  // 家长介入过多（parent_involvement）
  { id: 10, dimension: "parent_involvement", weight: 1, text: "如果家长不提醒，孩子很难主动开始学习。" },
  { id: 11, dimension: "parent_involvement", weight: 1, text: "学习怎么推进，很多时候主要由家长决定。" },
  { id: 12, dimension: "parent_involvement", weight: 1, text: "如果完全交给孩子，家长会担心学习停下来。" },

  // 自主整理能力不足（autonomy）
  { id: 13, dimension: "autonomy", weight: 1, text: "错题为什么错，孩子自己很难整理清楚。" },
  { id: 14, dimension: "autonomy", weight: 1, text: "没有人指示时，孩子经常不知道下一步该做什么。" },
  { id: 15, dimension: "autonomy", weight: 1, text: "孩子不太擅长自己回顾学习内容并做调整。" },

  // 精神负荷（mental_load）
  { id: 16, dimension: "mental_load", weight: 1, text: "因为学习，家长和孩子都明显感到疲惫。" },
  { id: 17, dimension: "mental_load", weight: 1, text: "一到考试前，家里的紧张感就明显变强。" },
  { id: 18, dimension: "mental_load", weight: 1, text: "每天的集中力和学习量波动很大，节奏不稳定。" },
];

