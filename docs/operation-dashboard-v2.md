# 运营看板 V2

## 1. V2 的目的

V2 不是增加产品功能，而是降低人工运营成本。

目标是让每天打开 Google Sheet 时，可以快速知道：

- 哪些单子已经联系
- 哪些单子已经付款
- 哪些单子已经生成整理包
- 哪些单子已经发送
- 今天最该先处理哪几单

## 2. 新增 Sheet

### operation_summary

用途：
- 汇总当前运营状态
- 一眼看出今天整体进度

字段：
- `metric_key`
- `metric_label`
- `metric_value`
- `updated_at`
- `note`

### operation_todo

用途：
- 自动列出今天最该处理的订单
- 作为人工跟进顺序的参考

字段：
- `priority`
- `todo_type`
- `diagnosis_id`
- `parent_name`
- `grade`
- `wechat_status`
- `payment_status`
- `delivery_status`
- `docs_url`
- `reason`
- `created_at`
- `updated_at`

## 3. operation_summary 字段说明

- `this_week_diagnosis_count`：本周诊断提交数
- `this_week_followup_count`：本周 followup 提交数
- `waiting_contact_count`：待联系数量
- `waiting_payment_count`：已联系但未付款数量
- `waiting_delivery_count`：已付款但未发送数量
- `generated_not_sent_count`：已生成 Docs 但未发送数量
- `paid_count`：已付款总数
- `sent_count`：已发送总数

## 4. operation_todo 优先级规则

### P1｜已付款待发送

条件：
- `payment_status = paid`
- 且 `delivery_status != sent`

理由：
- 已付款，但整理包尚未发送。需要优先处理。

### P2｜已生成但未联系

条件：
- `docs_url` 不为空
- 且 `wechat_status` 为空 / `not_contacted`
- 且 `delivery_status != sent`

理由：
- 整理包已生成，但尚未联系家长。

### P3｜已联系未付款

条件：
- `wechat_status = contacted`
- 且 `payment_status != paid`
- 且 `delivery_status != sent`

理由：
- 已联系但未付款，需要跟进付款或判断是否放弃。

### P4｜生成异常

条件：
- `delivery_status = failed`
- 或 `docs_url` 为空但理论上应该已生成

理由：
- 整理包生成或交付状态异常，需要人工检查。

## 5. refreshOperationDashboard() 使用方法

在 Apps Script 编辑器里手动运行：

```javascript
refreshOperationDashboard()
```

它会：

1. 读取 `operation_dashboard`
2. 计算 `operation_summary`
3. 清空旧 `operation_summary`
4. 写入新 `operation_summary`
5. 根据优先级规则生成 `operation_todo`
6. 清空旧 `operation_todo`
7. 写入新 `operation_todo`

## 6. 前期使用方式

前期可以先人工查看这三张表：

- `operation_dashboard`：单子级状态
- `operation_summary`：整体状态
- `operation_todo`：今天先处理什么

## 7. 验收标准

- 手动运行 `refreshOperationDashboard()` 后，能生成 `operation_summary`
- 手动运行 `refreshOperationDashboard()` 后，能生成 `operation_todo`
- 已付款未发送的数据进入 P1
- 已生成未联系的数据进入 P2
- 已联系未付款的数据进入 P3
- 异常数据进入 P4
- 不影响诊断提交
- 不影响 followup 提交
- 不影响 Docs 自动生成
- 不影响现有收款与发送状态更新
