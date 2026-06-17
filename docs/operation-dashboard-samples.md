# 运营看板验收样例

这个文件用于检查 `operation_dashboard` 的实际使用效果。

## 样例 1：已转化、已付款、已发送

- created_at: 2026-06-15T09:10:00+09:00
- diagnosis_id: JUKEN-20260615-A1B2C3
- parent_name: 山田さん
- contact: yamada@example.com
- grade_stage: 小学6年级
- juku_type: SAPIX
- weekly_focus: 作业取舍
- current_main_problem: 作业总是做不完
- sacrificed_area: 复习
- study_end_time: 22-23点
- hardest_subject: 算数
- wechat_status: converted
- payment_status: paid
- delivery_status: sent
- docs_url: https://docs.google.com/document/d/example-doc-1
- pdf_url: https://drive.google.com/file/d/example-pdf-1
- sent_at: 2026-06-15T18:20:00+09:00
- operator_memo: 已确认收款并发送整理包

### 这单怎么看

- 一眼能看出这单已经走到最后一步。
- `weekly_focus` 和 `delivery_status` 都已经清楚。
- `docs_url` / `pdf_url` 都有值，说明交付链路完整。

## 样例 2：已联系、待付款、已生成 Docs

- created_at: 2026-06-15T10:05:00+09:00
- diagnosis_id: JUKEN-20260615-D4E5F6
- parent_name: 佐藤さん
- contact: sato@example.com
- grade_stage: 小学5年级
- juku_type: 四谷大塚
- weekly_focus: 错题整理
- current_main_problem: 错题越来越多
- sacrificed_area: 错题整理
- study_end_time: 21-22点
- hardest_subject: 理科
- wechat_status: contacted
- payment_status: unpaid
- delivery_status: generated
- docs_url: https://docs.google.com/document/d/example-doc-2
- pdf_url: 
- sent_at: 
- operator_memo: 已发微信，等待确认是否购买

### 这单怎么看

- 已经产生整理包内容，但还没收款。
- `wechat_status` 和 `payment_status` 一眼就能看懂当前阶段。
- `pdf_url` 为空也没关系，Docs 已生成就足够先看内容。

## 样例 3：未联系、未开始

- created_at: 2026-06-15T11:40:00+09:00
- diagnosis_id: JUKEN-20260615-G7H8I9
- parent_name: 田中さん
- contact: tanaka@example.com
- grade_stage: 小学4年级
- juku_type: 日能研
- weekly_focus: 家长放手
- current_main_problem: 家长不敢放手
- sacrificed_area: 亲子关系的余裕
- study_end_time: 20-21点
- hardest_subject: 没有特别偏科
- wechat_status: not_contacted
- payment_status: unpaid
- delivery_status: not_started
- docs_url: 
- pdf_url: 
- sent_at: 
- operator_memo: 仅完成诊断，还没进入成交

### 这单怎么看

- 这是最前面的状态，还没开始加微信。
- 适合运营先从 `wechat_status` 推进。
- 如果后续进入成交，最先变化的会是 `wechat_status` 和 `payment_status`。

## 看板验收重点

1. 每一单都能用 `diagnosis_id` 找到。
2. `weekly_focus` 有值，能快速判断主题。
3. `wechat_status`、`payment_status`、`delivery_status` 能清楚区分阶段。
4. `docs_url` 和 `pdf_url` 能帮助判断是否已经交付。
5. `operator_memo` 适合放人工备注，不影响主流程。

## 结论

这个看板的作用不是自动管理，而是让人工运营时一眼知道：

- 哪一单还没联系
- 哪一单已经付款
- 哪一单已经生成整理包
- 哪一单已经发送
