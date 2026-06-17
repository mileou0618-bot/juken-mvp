# package-samples V3

这些样品基于当前 `gas/jukenDiagnosis.gs` 的真实生成逻辑生成，用于回归测试与产品验收。

## 1. 样品索引

- [sample-homework-triage.md](./sample-homework-triage.md) — 作业取舍
- [sample-mistake-review.md](./sample-mistake-review.md) — 错题整理
- [sample-parent-release.md](./sample-parent-release.md) — 家长放手
- [sample-priority-planning.md](./sample-priority-planning.md) — 优先级整理
- [sample-rhythm-reset.md](./sample-rhythm-reset.md) — 学习节奏调整

## 2. 每个主题适用场景

- 作业取舍：作业总是做不完 / 做完但没时间复习，且复习被挤掉。
- 错题整理：错题越来越多 / 错题反复错，适合先把少量高频错误弄明白。
- 家长放手：家长不敢放手 / 家长不催就不动，适合减少临时介入。
- 优先级整理：测试准备总是来不及 / 最近成绩下降，适合先理清先后顺序。
- 学习节奏调整：亲子冲突变多 / 睡眠与休息被压缩，适合先稳住结束时间。

## 3. 每个主题验收重点

- weekly_focus 是否准确落入目标主题。
- one_line_conclusion 是否与场景一致。
- keep/reduce/pause 是否明显不同。
- parent_goal / child_goal 是否对应该主题。
- tonight/tomorrow/this_week/weekend 是否有实际可执行动作。

## 4. 当前发现的问题

- parent_do_*、observation_*、weekend_action 仍然有一定骨架重复。
- 优先级整理 和 作业取舍 的语言结构最容易接近，需要继续拉开“先后顺序”和“任务减法”的差异。
- 有些场景下 child_focus 仍会复用最卡科目模板。

## 5. 下一轮最值得优化的主题

优先级整理。它最容易和“作业取舍”共用相似表达，但家长真正要看的不是“做多少”，而是“测试前先守住什么”。
