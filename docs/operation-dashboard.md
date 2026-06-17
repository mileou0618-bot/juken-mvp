# 运营看板 / 交付追踪体系

## 1. operation_dashboard 的用途

`operation_dashboard` 用来把每一单从“诊断 → 加微信 → 付款 → 生成整理包 → 发送”串起来，方便人工运营时一眼判断当前状态。

它不是自动化后台，也不是登录系统，只是一个运营追踪表。

## 2. 字段说明

- `created_at`：看板记录创建时间
- `diagnosis_id`：诊断ID
- `parent_name`：家长姓名
- `contact`：联系方式（前期可先记邮箱）
- `grade_stage`：年级阶段
- `juku_type`：补习班类型
- `weekly_focus`：本周整理重点
- `current_main_problem`：当前最困扰的问题
- `sacrificed_area`：本周最容易被挤掉的内容
- `study_end_time`：平日通常学习结束时间
- `hardest_subject`：最卡的科目
- `wechat_status`：微信跟进状态
- `payment_status`：付款状态
- `delivery_status`：交付状态
- `docs_url`：Google Docs 链接
- `pdf_url`：PDF 链接
- `sent_at`：发送时间
- `operator_memo`：运营备注

## 3. 状态值说明

### wechat_status
- `not_contacted`：尚未联系
- `contacted`：已联系
- `requested_package`：已提出要整理包
- `converted`：已转化

默认值：`not_contacted`

### payment_status
- `unpaid`：未付款
- `paid`：已付款
- `refunded`：已退款

默认值：`unpaid`

### delivery_status
- `not_started`：尚未开始
- `generated`：已生成
- `sent`：已发送
- `failed`：生成失败

默认值：`not_started`

## 4. 前期人工操作流程

1. 用户加微信
2. 用户发送诊断ID
3. 确认付款
4. 生成并检查 Docs
5. 发送整理包
6. 标记已发送

前期不需要复杂系统，只要每一单按这个顺序走完即可。

## 5. GAS 手动函数示例

```javascript
markPaymentPaid("JUKEN-XXXX")
markPackageSent("JUKEN-XXXX")
updateOperationStatus("JUKEN-XXXX", { operator_memo: "已通过微信确认需求" })
```

### updateOperationStatus 可更新字段

只允许更新：
- `wechat_status`
- `payment_status`
- `delivery_status`
- `sent_at`
- `operator_memo`

不允许更新：
- `diagnosis_id`
- `weekly_focus`
- `current_main_problem`
- `sacrificed_area`
- `docs_url`
- `pdf_url`

## 6. 使用建议

- 每一单先看 `diagnosis_id` 是否完整
- 再看 `weekly_focus` 是否已生成
- 再看 `docs_url` / `pdf_url` 是否可打开
- 最后更新付款和发送状态

如果某一项不确定，先不要急着发送。
