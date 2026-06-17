# Package Quality Checks

本文件说明 `package_outputs` 的交付前质量检查机制。

## 目的

在不修改整理包内容生成逻辑的前提下，先检查是否存在明显交付风险，避免把有问题的整理包发送出去。

## 检查内容

- 关键字段是否缺失
- 模板变量是否残留
- 是否出现禁用词
- `weekly_focus` 是否属于允许范围

## 结果

- `passed`：通过检查
- `failed`：存在问题，记录到 `package_quality_checks`

## 失败处理

检查失败时：

- 写入 `package_quality_checks`
- 将 `operation_dashboard.delivery_status` 标记为 `failed`
- 刷新运营看板

这样该订单会进入 `operation_todo` 的 P4。

## 手动运行

### 检查最新一单

```javascript
runLatestPackageQualityCheck();
```

### 检查指定诊断ID

```javascript
checkPackageQuality("JUKEN-XXXX");
```

## 说明

本机制只负责检查与拦截，不会自动修正文案，也不会自动发送整理包。
