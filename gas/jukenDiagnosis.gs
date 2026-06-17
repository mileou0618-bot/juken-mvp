const SPREADSHEET_ID = "1-UhodlWz4ViAJH5ZGaqSO4meh7lRkzn7m9QlK-jvIbo";
const SHEET_NAME = "diagnosis_data_v2";
const FOLLOWUP_SHEET_NAME = "followup_answers";
const PACKAGE_SHEET_NAME = "package_outputs";
const OPERATION_DASHBOARD_NAME = "operation_dashboard";
const PACKAGE_QUALITY_SHEET_NAME = "package_quality_checks";
// Google Docs template + PDF output folder (Phase: learning package PDF).
// IMPORTANT: Do NOT commit real IDs. Fill these in Apps Script editor or Script Properties.
// Recommended: set Script Properties:
// - PACKAGE_TEMPLATE_DOC_ID
// - PACKAGE_OUTPUT_FOLDER_ID
const PACKAGE_TEMPLATE_DOC_ID = "填写Google Docs模板ID";
const PACKAGE_OUTPUT_FOLDER_ID = "填写PDF输出文件夹ID";
// Backward-compatible legacy keys (keep empty).
const PACKAGE_DOC_TEMPLATE_ID = "";
const PACKAGE_PDF_FOLDER_ID = "";

// Manual check helper (run this from Apps Script editor to verify ID + permissions)
function testOpenSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log(ss.getName());
}

function getDiagnosisSheet() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  var headers = getHeaders();
  var lastCol = sheet.getLastColumn();
  var existingHeaders = [];
  if (lastCol > 0) {
    existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  var hasAnyHeader = existingHeaders.some(function (value) {
    return safeString(value).trim() !== "";
  });

  // This sheet is dedicated for the app. Keep header order fixed to getHeaders().
  // If headers are missing/partial, overwrite header row to a clean state.
  if (!hasAnyHeader || lastCol !== headers.length) {
    var width = Math.max(lastCol, headers.length, 1);
    sheet.getRange(1, 1, 1, width).clearContent();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    // If same width but different content, still overwrite to guarantee a clean header row.
    var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(function (v) { return safeString(v).trim(); });
    var expected = headers.map(function (v) { return safeString(v).trim(); });
    var mismatch = false;
    for (var i = 0; i < expected.length; i++) {
      if (current[i] !== expected[i]) {
        mismatch = true;
        break;
      }
    }
    if (mismatch) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  return sheet;
}

function doPost(e) {
  var sheetOk = false;
  var mailOk = false;
  var sheetError = "";
  var mailError = "";

  try {
    var payload = parsePayload(e);
    Logger.log("payload received");
    try {
      Logger.log(JSON.stringify(payload));
    } catch (logErr) {
      Logger.log("payload stringify failed: " + safeString(logErr));
    }

    try {
      // lookup branch
      if (payload && payload.action === "lookupDiagnosis") {
        return jsonResponse(lookupDiagnosis(payload));
      }
      // followup submit + package generation branch
      if (payload && payload.action === "submitFollowup") {
        var followupResult = submitFollowup(payload);
        return jsonResponse(followupResult);
      }
      // manual package generation branch (internal use)
      if (payload && payload.action === "generateLearningPackage") {
        var pkg = generateLearningPackage(safeString(payload.diagnosisId).trim());
        return jsonResponse(pkg);
      }
      // package PDF generation branch (internal use)
      if (payload && payload.action === "generatePackagePdf") {
        var pdf = generateLearningPackagePdf(safeString(payload.diagnosisId).trim());
        return jsonResponse(pdf);
      }

      appendToSheet(payload);
      sheetOk = true;
    } catch (sheetErr) {
      sheetError = safeString(sheetErr && sheetErr.message ? sheetErr.message : sheetErr) || "Sheet append failed";
      Logger.log("Sheet append failed: " + sheetError);
    }

    try {
      mailOk = sendDiagnosisMail(payload) === true;
    } catch (mailErr) {
      mailError = safeString(mailErr && mailErr.message ? mailErr.message : mailErr) || "Mail send failed";
      Logger.log("Mail send failed: " + mailError);
    }

    Logger.log("sheetOk=" + sheetOk);
    Logger.log("mailOk=" + mailOk);
    Logger.log("sheetError=" + sheetError);
    Logger.log("mailError=" + mailError);

    return jsonResponse({
      ok: sheetOk || mailOk,
      sheetOk: sheetOk,
      sheetError: sheetError,
      mailOk: mailOk,
      mailError: mailError,
    });
  } catch (err) {
    var fatal = safeString(err && err.message ? err.message : err) || "Unknown error";
    Logger.log("doPost failed: " + safeString(err && err.stack ? err.stack : err));
    return jsonResponse({
      ok: false,
      sheetOk: false,
      sheetError: "",
      mailOk: false,
      mailError: "",
      error: fatal,
    });
  }
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Invalid JSON");
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error("Invalid JSON");
  }
}

function appendToSheet(payload) {
  var headers = getHeaders();
  var sheet = getDiagnosisSheet();

  var row = headers.map(function (key) {
    if (key === "mailCauses" || key === "mailThisWeekActions") {
      return formatList(payload[key]);
    }
    return safeString(payload[key]);
  });

  sheet.appendRow(row);
  return true;
}

function getOrCreateSheet_(sheetName, headers) {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  // Initialize / append missing headers safely (do not overwrite existing user data).
  ensureHeaders(sheet, headers);
  return sheet;
}

function getFollowupHeaders() {
  return [
    "created_at",
    "diagnosis_id",
    // New (v2) followup fields (prioritized)
    "grade_stage",
    "juku_type",
    "study_end_time",
    "hardest_subject",
    "current_main_problem",
    "sacrificed_area",
    "hardest_tradeoff",
    "memo",
    // Legacy fields kept for backward compatibility
    "grade",
    "weekday_end_time",
    "weak_subject",
    "main_problem",
    "parent_role",
  ];
}

function getPackageHeaders() {
  return [
    "created_at",
    "diagnosis_id",
    "diagnosis_type",
    "main_summary",
    "keep_1",
    "keep_2",
    "reduce_1",
    "reduce_2",
    "parent_check_1",
    "parent_check_2",
    "day1_focus",
    "day1_parent_check",
    "day2_focus",
    "day2_parent_check",
    "day3_focus",
    "day3_parent_check",
    "day4_focus",
    "day4_parent_check",
    "day5_focus",
    "day5_parent_check",
    "day6_focus",
    "day6_parent_check",
    "day7_focus",
    "day7_parent_check",
    "payment_status",
    // Added later: keep near output URLs
    "doc_url",
    "pdf_status",
    "sent_status",
    "pdf_url",
    // New derived rule fields (v2) - MUST be appended at the end to avoid header drift
    "primary_problem",
    "secondary_problem",
    "keep_reason_1",
    "keep_reason_2",
    "reduce_reason_1",
    "reduce_reason_2",
    "parent_check_reason_1",
    "parent_check_reason_2",
    "weekly_focus",
    "surface_problem",
    "real_problem",
    "keep_3",
    "reduce_3",
    "parent_do_1",
    "parent_do_2",
    "parent_stop_1",
    "parent_stop_2",
    "child_focus",
    "observation_1",
    "observation_2",
    "observation_3",
    "judgement_reason_1",
    "judgement_reason_2",
    "judgement_reason_3",
    "tonight_action",
    "tomorrow_action",
    "this_week_action",
    "weekend_action",
    "pause_1",
    "pause_2",
    "pause_3",
    "focus_theme",
    "one_line_conclusion",
    "parent_goal",
    "child_goal",
    "keep_reason",
    "reduce_reason",
  ];
}

function getPackageQualityHeaders() {
  return [
    "checked_at",
    "diagnosis_id",
    "result",
    "error_type",
    "error_message",
    "field_name",
    "detected_value",
    "weekly_focus",
    "docs_url",
    "operation_action",
  ];
}

function getOperationDashboardHeaders() {
  return [
    "created_at",
    "diagnosis_id",
    "parent_name",
    "contact",
    "grade_stage",
    "juku_type",
    "weekly_focus",
    "current_main_problem",
    "sacrificed_area",
    "study_end_time",
    "hardest_subject",
    "wechat_status",
    "payment_status",
    "delivery_status",
    "docs_url",
    "pdf_url",
    "sent_at",
    "operator_memo",
  ];
}

function getOperationDashboardSheet() {
  return getOrCreateSheet_(OPERATION_DASHBOARD_NAME, getOperationDashboardHeaders());
}

function getPackageQualitySheet() {
  return getOrCreateSheet_(PACKAGE_QUALITY_SHEET_NAME, getPackageQualityHeaders());
}

function operationAliasValue_(source, aliases) {
  if (!source) return "";
  var list = Array.isArray(aliases) ? aliases : [aliases];
  for (var i = 0; i < list.length; i++) {
    var key = list[i];
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      var value = safeString(source[key]).trim();
      if (value !== "") return value;
    }
  }
  return "";
}

function normalizeWechatStatus_(value) {
  var s = safeString(value).trim();
  if (!s) return "not_contacted";
  var lower = s.toLowerCase();
  if (["not_contacted", "not contacted", "notcontacted", "未联系", "未聯繫", "未聯络", "尚未联系", "尚未聯繫", "尚未聯络", "未連絡", "未连络"].indexOf(lower) >= 0) return "not_contacted";
  if (["contacted", "已联系", "已聯繫", "已联络", "已連絡", "已沟通", "已聯絡"].indexOf(lower) >= 0) return "contacted";
  if (["requested_package", "requested package", "requestedpackage", "想看整理包", "已提出要整理包", "package_requested"].indexOf(lower) >= 0) return "requested_package";
  if (["converted", "已转化", "已轉化", "added", "已添加", "已加微信", "已加", "已加入"].indexOf(lower) >= 0) return "converted";
  return s;
}

function normalizePaymentStatus_(value) {
  var s = safeString(value).trim();
  if (!s) return "unpaid";
  var lower = s.toLowerCase();
  if (["unpaid", "未付款", "未支付", "待付款", "pending", "待支付"].indexOf(lower) >= 0) return "unpaid";
  if (["paid", "已付款", "已支付", "已收款", "paid_done", "completed", "完了"].indexOf(lower) >= 0) return "paid";
  if (["refunded", "已退款", "退款完成"].indexOf(lower) >= 0) return "refunded";
  return s;
}

function normalizeDeliveryStatus_(value) {
  var s = safeString(value).trim();
  if (!s) return "not_started";
  var lower = s.toLowerCase();
  if (["not_started", "not started", "未开始", "未開始", "尚未开始", "尚未開始", "未发送", "未發送", "not_sent"].indexOf(lower) >= 0) return "not_started";
  if (["generated", "已生成", "生成成功", "docs_generated", "document_generated"].indexOf(lower) >= 0) return "generated";
  if (["sent", "已发送", "已發送", "发送完成", "發送完成", "delivered"].indexOf(lower) >= 0) return "sent";
  if (["failed", "生成失败", "生成失敗", "交付失败", "交付失敗"].indexOf(lower) >= 0) return "failed";
  return s;
}

function normalizeOperationRow_(rawRow) {
  var row = rawRow || {};
  return {
    created_at: operationAliasValue_(row, ["created_at", "timestamp", "submitted_at", "submittedAt", "createdAt"]),
    diagnosis_id: operationAliasValue_(row, ["diagnosis_id", "diagnosisId"]),
    parent_name: operationAliasValue_(row, ["parent_name", "parentName", "guardian_name", "guardianName", "name"]),
    contact: operationAliasValue_(row, ["contact", "email", "mail", "phone"]),
    grade_stage: operationAliasValue_(row, ["grade_stage", "grade", "gradeStage"]),
    grade: operationAliasValue_(row, ["grade", "grade_stage", "gradeStage"]),
    juku_type: operationAliasValue_(row, ["juku_type", "cramSchool", "cram_school", "school_type"]),
    weekly_focus: operationAliasValue_(row, ["weekly_focus", "focus_theme"]),
    current_main_problem: operationAliasValue_(row, ["current_main_problem", "main_problem"]),
    sacrificed_area: operationAliasValue_(row, ["sacrificed_area", "hardest_tradeoff"]),
    study_end_time: operationAliasValue_(row, ["study_end_time", "weekday_end_time"]),
    hardest_subject: operationAliasValue_(row, ["hardest_subject", "weak_subject"]),
    wechat_status: normalizeWechatStatus_(operationAliasValue_(row, ["wechat_status", "wechatStatus", "contact_status", "wechatState"])),
    payment_status: normalizePaymentStatus_(operationAliasValue_(row, ["payment_status", "paymentStatus", "paid_status"])),
    delivery_status: normalizeDeliveryStatus_(operationAliasValue_(row, ["delivery_status", "deliveryStatus", "sent_status", "send_status"])),
    docs_url: operationAliasValue_(row, ["docs_url", "doc_url", "document_url", "google_docs_url"]),
    pdf_url: operationAliasValue_(row, ["pdf_url", "pdfUrl"]),
    sent_at: operationAliasValue_(row, ["sent_at", "sentAt"]),
    operator_memo: operationAliasValue_(row, ["operator_memo", "memo", "note"]),
  };
}

function sortUniques_(values) {
  var seen = {};
  var out = [];
  (values || []).forEach(function (value) {
    var s = safeString(value).trim();
    if (!s || seen[s]) return;
    seen[s] = true;
    out.push(s);
  });
  out.sort();
  return out;
}

function getOperationSummaryHeaders() {
  return [
    "metric_key",
    "metric_label",
    "metric_value",
    "updated_at",
    "note",
  ];
}

function getOperationTodoHeaders() {
  return [
    "priority",
    "todo_type",
    "diagnosis_id",
    "parent_name",
    "grade",
    "wechat_status",
    "payment_status",
    "delivery_status",
    "docs_url",
    "reason",
    "created_at",
    "updated_at",
  ];
}

function getOperationSummarySheet() {
  return getOrCreateSheet_("operation_summary", getOperationSummaryHeaders());
}

function getOperationTodoSheet() {
  return getOrCreateSheet_("operation_todo", getOperationTodoHeaders());
}

function getScriptProperty_(key, fallback) {
  try {
    var props = PropertiesService.getScriptProperties();
    var v = props.getProperty(key);
    if (v && safeString(v).trim() !== "") return safeString(v).trim();
  } catch (e) {
    // ignore
  }
  return safeString(fallback).trim();
}

function getDiagnosisDocTemplateId_() {
  // Prefer Script Properties to avoid committing IDs.
  // Script property keys:
  // - PACKAGE_TEMPLATE_DOC_ID
  // - PACKAGE_OUTPUT_FOLDER_ID
  // (legacy)
  // - PACKAGE_DOC_TEMPLATE_ID
  var fromNewKey = getScriptProperty_("PACKAGE_TEMPLATE_DOC_ID", "");
  if (fromNewKey) return fromNewKey;

  var fromLegacyKey = getScriptProperty_("PACKAGE_DOC_TEMPLATE_ID", "");
  if (fromLegacyKey) return fromLegacyKey;

  var fallback = PACKAGE_TEMPLATE_DOC_ID !== "填写Google Docs模板ID" ? PACKAGE_TEMPLATE_DOC_ID : "";
  if (fallback) return safeString(fallback).trim();
  return safeString(PACKAGE_DOC_TEMPLATE_ID).trim();
}

function getPdfFolderId_() {
  var fromNewKey = getScriptProperty_("PACKAGE_OUTPUT_FOLDER_ID", "");
  if (fromNewKey) return fromNewKey;

  var fromLegacyKey = getScriptProperty_("PACKAGE_PDF_FOLDER_ID", "");
  if (fromLegacyKey) return fromLegacyKey;

  var fallback = PACKAGE_OUTPUT_FOLDER_ID !== "填写PDF输出文件夹ID" ? PACKAGE_OUTPUT_FOLDER_ID : "";
  if (fallback) return safeString(fallback).trim();
  return safeString(PACKAGE_PDF_FOLDER_ID).trim();
}

function submitFollowup(payload) {
  var diagnosisId = safeString(payload.diagnosisId).trim();
  if (!diagnosisId) return { ok: false, error: "BAD_REQUEST" };

  var sheet = getOrCreateSheet_(FOLLOWUP_SHEET_NAME, getFollowupHeaders());
  // Ensure new headers exist, but DO NOT reorder existing headers.
  ensureHeaders(sheet, getFollowupHeaders());
  var lastCol = sheet.getLastColumn();
  var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  headers = headers.map(function (v) { return safeString(v).trim(); });

  // Normalize payload keys (support both camelCase and snake_case).
  var normalized = {};
  Object.keys(payload || {}).forEach(function (k) {
    normalized[k] = payload[k];
  });
  if (!normalized.created_at) normalized.created_at = payload.createdAt || new Date().toISOString();
  if (!normalized.diagnosis_id) normalized.diagnosis_id = payload.diagnosis_id || diagnosisId;
  if (!normalized.sacrificed_area) normalized.sacrificed_area = payload.sacrificed_area || payload.hardest_tradeoff || "";
  if (!normalized.hardest_tradeoff) normalized.hardest_tradeoff = normalized.sacrificed_area || payload.hardest_tradeoff || "";

  var row = headers.map(function (key) {
    return safeString(normalized[key]);
  });

  sheet.appendRow(row);

  // Best-effort: generate package immediately (does not block followup save).
  var packageResult = null;
  var packageGenerated = false;
  try {
    packageResult = generateLearningPackage(diagnosisId);
    packageGenerated = !!(packageResult && packageResult.ok === true);
  } catch (e) {
    packageResult = { ok: false, error: "PACKAGE_GENERATION_FAILED", message: safeString(e && e.message ? e.message : e) };
  }

  // Best-effort: generate Google Docs (must) + PDF (optional). Never block followup save.
  var docGenerated = false;
  var pdfGenerated = false;
  var pdfError = "";
  try {
    var pdfResult = generateLearningPackagePdf(diagnosisId);
    docGenerated = !!(pdfResult && pdfResult.docGenerated === true);
    pdfGenerated = !!(pdfResult && pdfResult.pdfGenerated === true);
    pdfError = safeString(pdfResult && pdfResult.pdfError ? pdfResult.pdfError : "");
  } catch (e2) {
    pdfError = safeString(e2 && e2.message ? e2.message : e2) || "PDF generation failed";
  }

  return {
    ok: true,
    followupSaved: true,
    diagnosisId: diagnosisId,
    packageGenerated: packageGenerated,
    docGenerated: docGenerated,
    pdfGenerated: pdfGenerated,
    pdfError: pdfError,
    package: packageResult,
  };
}

function getHeaders() {
  return [
    "submittedAt",
    "name",
    "email",
    "grade",
    "cramSchool",
    "diagnosisType",
    "diagnosisLabel",
    "urgency",
    "maxScore",
    "score_surfaceEffort",
    "score_understandingGap",
    "score_speedGap",
    "score_planningChaos",
    "score_overload",
    "score_instability",
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
    "q6",
    "q7",
    "q8",
    "q9",
    "q10",
    "q11",
    "q12",
    "q13",
    "q14",
    "q15",
    "q16",
    "q17",
    "q18",
    "mailDiagnosisLabel",
    "mailCurrentTrend",
    "mailProblemSummary",
    "mailCauses",
    "mailThisWeekActions",
    "mailParentMessage",
    // Added later: keep at the end to avoid shifting existing columns in already-initialized Sheets.
    "language",
    // internal diagnosis trace
    "diagnosisId",
    "overallRisk",
    "homework_load",
    "review_retention",
    "planning",
    "parent_involvement",
    "autonomy",
    "mental_load",
    "answersJson",
    "thisWeekAction",
  ];
}

function getLatestRowByKey_(sheet, keyHeader, keyValue) {
  var id = safeString(keyValue).trim();
  if (!id) return null;

  var range = sheet.getDataRange();
  var allValues = range.getValues();
  if (!allValues || allValues.length < 2) return null;

  var headers = allValues[0].map(function (v) { return safeString(v).trim(); });
  var idx = headers.indexOf(keyHeader);
  if (idx < 0) return null;

  var rows = allValues.slice(1);
  var lastMatch = null;
  for (var i = 0; i < rows.length; i++) {
    if (safeString(rows[i][idx]).trim() === id) {
      lastMatch = rows[i];
    }
  }
  if (!lastMatch) return null;
  return { headers: headers, row: lastMatch };
}

function getLatestPackage_(diagnosisId) {
  var sheet = getOrCreateSheet_(PACKAGE_SHEET_NAME, getPackageHeaders());
  return getLatestRowByKey_(sheet, "diagnosis_id", diagnosisId);
}

function getLatestPackageDiagnosisId_() {
  var sheet = getOrCreateSheet_(PACKAGE_SHEET_NAME, getPackageHeaders());
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return "";
  var headers = data[0].map(function (v) { return safeString(v).trim(); });
  var idx = headers.indexOf("diagnosis_id");
  if (idx < 0) return "";
  for (var i = data.length - 1; i >= 1; i--) {
    var id = safeString(data[i][idx]).trim();
    if (id !== "") return id;
  }
  return "";
}

function getPackageValueByAliases_(headers, row, aliases) {
  if (!headers || !row) return "";
  var list = Array.isArray(aliases) ? aliases : [aliases];
  for (var i = 0; i < list.length; i++) {
    var key = list[i];
    var idx = headers.indexOf(key);
    if (idx >= 0) {
      var value = safeString(row[idx]).trim();
      if (value !== "") return value;
    }
  }
  return "";
}

function normalizePackageQualityFieldValue_(value) {
  return safeString(value).replace(/\s+/g, " ").trim();
}

function detectPackageQualityIssues_(pkgHeaders, pkgRow) {
  var issues = [];
  var getValue = function (aliases) {
    return normalizePackageQualityFieldValue_(getPackageValueByAliases_(pkgHeaders, pkgRow, aliases));
  };

  var canonical = {
    diagnosis_id: getValue(["diagnosis_id"]),
    weekly_focus: getValue(["weekly_focus"]),
    docs_url: getValue(["docs_url", "doc_url", "document_url", "google_docs_url"]),
    surface_problem: getValue(["surface_problem"]),
    real_problem: getValue(["real_problem"]),
    keep_3: getValue(["keep_3"]),
    reduce_3: getValue(["reduce_3"]),
    parent_do: getValue(["parent_do", "parent_do_1", "parent_do_2", "parent_check_1", "parent_check_2"]),
    parent_stop: getValue(["parent_stop", "parent_stop_1", "parent_stop_2"]),
    child_focus: getValue(["child_focus"]),
    observation: getValue(["observation", "observation_1", "observation_2", "observation_3"]),
  };

  var requiredFields = [
    ["diagnosis_id", "诊断ID"],
    ["weekly_focus", "本周整理重点"],
    ["docs_url", "Docs链接"],
    ["surface_problem", "看起来的问题"],
    ["real_problem", "真正的问题"],
    ["keep_3", "本周必须保住的内容"],
    ["reduce_3", "本周应该停止/减少的内容"],
    ["parent_do", "家长本周做什么"],
    ["parent_stop", "家长本周不要做什么"],
    ["child_focus", "孩子本周只练什么"],
    ["observation", "本周观察重点"],
  ];

  for (var i = 0; i < requiredFields.length; i++) {
    var key = requiredFields[i][0];
    var label = requiredFields[i][1];
    if (!canonical[key]) {
      issues.push({
        result: "failed",
        error_type: "missing_field",
        error_message: label + " 为空",
        field_name: key,
        detected_value: "",
      });
    }
  }

  var textBlob = Object.keys(canonical).map(function (key) { return canonical[key]; }).concat(
    (pkgHeaders || []).map(function (header, idx) {
      return normalizePackageQualityFieldValue_(safeString(pkgRow[idx]));
    })
  ).join("\n");

  if (textBlob.indexOf("{{") >= 0 || textBlob.indexOf("}}") >= 0) {
    issues.push({
      result: "failed",
      error_type: "template_placeholder",
      error_message: "模板变量仍未替换完毕",
      field_name: "template",
      detected_value: textBlob.match(/{{[^}]*}}/g) ? textBlob.match(/{{[^}]*}}/g).join(", ") : "{{...}}",
    });
  }

  var bannedWords = [
    "回收",
    "定着",
    "優先順位",
    "优先顺位",
    "学習構造",
    "学習结构",
    "AI分析",
    "改善成绩",
    "保证提升",
  ];
  for (var b = 0; b < bannedWords.length; b++) {
    if (textBlob.indexOf(bannedWords[b]) >= 0) {
      issues.push({
        result: "failed",
        error_type: "forbidden_word",
        error_message: "检测到禁用词：" + bannedWords[b],
        field_name: "text",
        detected_value: bannedWords[b],
      });
      break;
    }
  }

  var allowedWeeklyFocus = {
    "作业取舍": true,
    "错题整理": true,
    "家长放手": true,
    "优先级整理": true,
    "学习节奏调整": true,
  };
  var weeklyFocus = canonical.weekly_focus;
  if (weeklyFocus && !allowedWeeklyFocus[weeklyFocus]) {
    issues.push({
      result: "failed",
      error_type: "invalid_weekly_focus",
      error_message: "weekly_focus 不在允许范围内",
      field_name: "weekly_focus",
      detected_value: weeklyFocus,
    });
  }

  return {
    canonical: canonical,
    issues: issues,
    textBlob: textBlob,
  };
}

function appendPackageQualityChecks_(rows) {
  var sheet = getPackageQualitySheet();
  ensureHeaders(sheet, getPackageQualityHeaders());
  if (!rows || !rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, getPackageQualityHeaders().length).setValues(rows);
}

function escapeForReplaceText_(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAllDocVars_(doc, vars) {
  var body = doc.getBody();
  Object.keys(vars).forEach(function (key) {
    var value = vars[key];
    var pattern = "\\{\\{" + escapeForReplaceText_(key) + "\\}\\}";
    body.replaceText(pattern, safeString(value));
  });
}

function removeLeadingTemplateTitle_(doc, templateTitleCandidates) {
  var body = doc.getBody();
  if (!body) return;

  var candidates = (templateTitleCandidates || [])
    .map(function (s) { return safeString(s).trim(); })
    .filter(function (s) { return s !== ""; });

  // Also remove common template marker if present.
  candidates.push("Juken_7Day_Template");

  function isRemovableParagraph_(p) {
    if (!p) return false;
    var t = safeString(p.getText()).trim();
    if (t === "") return true;
    for (var i = 0; i < candidates.length; i++) {
      if (t === candidates[i]) return true;
    }
    return false;
  }

  // Remove empty/title paragraphs at the very top so PDF starts from actual content.
  // This avoids a blank first page that only contains the template filename/title.
  while (body.getNumChildren() > 0) {
    var child = body.getChild(0);
    var type = child.getType();
    if (type === DocumentApp.ElementType.PARAGRAPH) {
      var p = child.asParagraph();
      if (isRemovableParagraph_(p)) {
        body.removeChild(child);
        continue;
      }
    }
    if (type === DocumentApp.ElementType.TABLE) {
      var t = safeString(child.asTable().getText()).trim();
      if (t === "") {
        body.removeChild(child);
        continue;
      }
      for (var j = 0; j < candidates.length; j++) {
        if (t === candidates[j]) {
          body.removeChild(child);
          continue;
        }
      }
    }
    break;
  }
}

function clearHeaderFooterIfExactMatch_(doc, templateTitleCandidates) {
  var candidates = (templateTitleCandidates || [])
    .map(function (s) { return safeString(s).trim(); })
    .filter(function (s) { return s !== ""; });

  // Common template marker.
  candidates.push("Juken_7Day_Template");

  function clearIfMatch_(section) {
    if (!section) return;
    var t = safeString(section.getText()).trim();
    if (!t) return;
    for (var i = 0; i < candidates.length; i++) {
      if (t === candidates[i]) {
        // Only clear when the ENTIRE header/footer equals the template marker.
        // This is a precise fix for the extra first-page title without touching real content.
        section.clear();
        return;
      }
    }
  }

  try {
    clearIfMatch_(doc.getHeader());
  } catch (e) {
    // ignore
  }
  try {
    clearIfMatch_(doc.getFooter());
  } catch (e2) {
    // ignore
  }
}

function build7DayTableText_(pkg) {
  var lines = [];
  for (var d = 1; d <= 7; d++) {
    var focus = safeString(pkg["day" + d + "_focus"]).trim();
    var check = safeString(pkg["day" + d + "_parent_check"]).trim();
    if (!focus && !check) continue;
    lines.push("Day" + d + "：" + focus);
    if (check) lines.push("  家长确认：" + check);
  }
  return lines.join("\n");
}

// Backward-compatible wrapper.
function generatePackagePdf(diagnosisId) {
  return generateLearningPackagePdf(diagnosisId);
}

// Spec name: generateLearningPackagePdf(diagnosisId)
function generateLearningPackagePdf(diagnosisId) {
  var id = safeString(diagnosisId).trim();
  if (!id) return { ok: false, error: "BAD_REQUEST" };

  var templateId = getDiagnosisDocTemplateId_();
  var folderId = getPdfFolderId_();
  if (!templateId) {
    return { ok: false, error: "TEMPLATE_DOC_ID or OUTPUT_FOLDER_ID is missing", docGenerated: false, pdfGenerated: false };
  }

  // Ensure package exists; if missing, attempt to generate.
  var pkg = getLatestPackage_(id);
  if (!pkg) {
    var gen = generateLearningPackage(id);
    if (!gen || gen.ok !== true) return { ok: false, error: "package_outputs not found for diagnosisId" };
    pkg = getLatestPackage_(id);
  }
  if (!pkg) return { ok: false, error: "package_outputs not found for diagnosisId" };

  var pkgHeaders = pkg.headers;
  var pkgRow = pkg.row;
  function p(key) {
    var i = pkgHeaders.indexOf(key);
    if (i < 0) return "";
    return safeString(pkgRow[i]);
  }

  // Pull display fields from diagnosis + followup (best-effort).
  var diagnosisSheet = getDiagnosisSheet();
  var diagnosisFound = findRowByDiagnosisId_(diagnosisSheet, id);
  var parentName = "";
  var language = "cn";
  if (diagnosisFound) {
    parentName = getRowValue_(diagnosisFound.headers, diagnosisFound.row, "name");
    language = safeString(getRowValue_(diagnosisFound.headers, diagnosisFound.row, "language")).trim() || language;
  }

  var followup = getLatestFollowup_(id);
  var grade = "";
  if (followup) {
    var gi = followup.headers.indexOf("grade");
    if (gi >= 0) grade = safeString(followup.row[gi]);
  }

  var folder = null;
  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (eFolder) {
      folder = null;
    }
  }
  var fileNameBase = "7天家庭学习整理包_" + id;

  // 1) Copy template doc
  var templateFile = DriveApp.getFileById(templateId);
  var docFile = folder ? templateFile.makeCopy(fileNameBase, folder) : templateFile.makeCopy(fileNameBase);
  var docId = docFile.getId();
  Logger.log("[pkgpdf] templateFileId=" + templateFile.getId());
  Logger.log("[pkgpdf] docFileId=" + docFile.getId());
  Logger.log("[pkgpdf] copiedDocId=" + docId);

  // 2) Replace vars
  var doc = DocumentApp.openById(docId);
  var vars = {
    diagnosis_id: id,
    diagnosis_type: p("diagnosis_type"),
    weekly_focus: p("weekly_focus"),
    focus_theme: p("focus_theme"),
    one_line_conclusion: p("one_line_conclusion"),
    parent_goal: p("parent_goal"),
    child_goal: p("child_goal"),
    keep_reason: p("keep_reason"),
    reduce_reason: p("reduce_reason"),
    parent_name: parentName ? parentName : (language === "cn" ? "家长" : "保護者様"),
    grade: grade,
    main_summary: p("main_summary"),
    surface_problem: p("surface_problem"),
    real_problem: p("real_problem"),
    keep_1: p("keep_1"),
    keep_2: p("keep_2"),
    keep_3: p("keep_3"),
    keep_reason_1: p("keep_reason_1"),
    keep_reason_2: p("keep_reason_2"),
    reduce_1: p("reduce_1"),
    reduce_2: p("reduce_2"),
    reduce_3: p("reduce_3"),
    reduce_reason_1: p("reduce_reason_1"),
    reduce_reason_2: p("reduce_reason_2"),
    parent_check_1: p("parent_check_1"),
    parent_check_2: p("parent_check_2"),
    parent_check_reason_1: p("parent_check_reason_1"),
    parent_check_reason_2: p("parent_check_reason_2"),
    parent_do_1: p("parent_do_1"),
    parent_do_2: p("parent_do_2"),
    parent_stop_1: p("parent_stop_1"),
    parent_stop_2: p("parent_stop_2"),
    child_focus: p("child_focus"),
    observation_1: p("observation_1"),
    observation_2: p("observation_2"),
    observation_3: p("observation_3"),
    judgement_reason_1: p("judgement_reason_1"),
    judgement_reason_2: p("judgement_reason_2"),
    judgement_reason_3: p("judgement_reason_3"),
    tonight_action: p("tonight_action"),
    tomorrow_action: p("tomorrow_action"),
    this_week_action: p("this_week_action"),
    weekend_action: p("weekend_action"),
    pause_1: p("pause_1"),
    pause_2: p("pause_2"),
    pause_3: p("pause_3"),
    day1_focus: p("day1_focus"),
    day1_parent_check: p("day1_parent_check"),
    day2_focus: p("day2_focus"),
    day2_parent_check: p("day2_parent_check"),
    day3_focus: p("day3_focus"),
    day3_parent_check: p("day3_parent_check"),
    day4_focus: p("day4_focus"),
    day4_parent_check: p("day4_parent_check"),
    day5_focus: p("day5_focus"),
    day5_parent_check: p("day5_parent_check"),
    day6_focus: p("day6_focus"),
    day6_parent_check: p("day6_parent_check"),
    day7_focus: p("day7_focus"),
    day7_parent_check: p("day7_parent_check"),
    day_table: build7DayTableText_({
      day1_focus: p("day1_focus"),
      day1_parent_check: p("day1_parent_check"),
      day2_focus: p("day2_focus"),
      day2_parent_check: p("day2_parent_check"),
      day3_focus: p("day3_focus"),
      day3_parent_check: p("day3_parent_check"),
      day4_focus: p("day4_focus"),
      day4_parent_check: p("day4_parent_check"),
      day5_focus: p("day5_focus"),
      day5_parent_check: p("day5_parent_check"),
      day6_focus: p("day6_focus"),
      day6_parent_check: p("day6_parent_check"),
      day7_focus: p("day7_focus"),
      day7_parent_check: p("day7_parent_check"),
    }),
  };
  replaceAllDocVars_(doc, vars);
  // If the template has a header/footer that only contains the template name,
  // clear it so the exported PDF doesn't get an extra title-only first page.
  clearHeaderFooterIfExactMatch_(doc, [templateFile.getName(), docFile.getName()]);
  // Remove leading blank/title-only paragraphs (e.g., template filename) to avoid an empty first page.
  removeLeadingTemplateTitle_(doc, [templateFile.getName(), docFile.getName()]);
  doc.saveAndClose();

  var docUrl = docFile.getUrl();
  // 3) Update package_outputs with doc_url (even if PDF fails later).
  try {
    updatePackageOutputUrls_(id, { doc_url: docUrl });
  } catch (docWriteErr) {
    Logger.log("package_outputs doc_url update failed: " + safeString(docWriteErr));
  }

  // 4) Export to PDF (best-effort)
  // Ensure we export from the COPIED document file, not the template file.
  var exportedPdfSourceFileId = docFile.getId();
  Logger.log("[pkgpdf] exportedPdfSourceFileId=" + exportedPdfSourceFileId);
  Logger.log("[pkgpdf] exportMethod=Drive.Files.export");
  // Allow Drive to reflect the latest doc edits before exporting.
  Utilities.sleep(800);

  // Export using Drive API export endpoint with OAuth token.
  // Note: Advanced Drive Service's Drive.Files.export may require alt=media; UrlFetchApp is the most reliable way to get bytes.
  var token = ScriptApp.getOAuthToken();
  var exportUrl =
    "https://www.googleapis.com/drive/v3/files/" +
    encodeURIComponent(exportedPdfSourceFileId) +
    "/export?mimeType=" +
    encodeURIComponent("application/pdf");
  Logger.log("[pkgpdf] exportUrl=" + exportUrl);
  var exportRes = UrlFetchApp.fetch(exportUrl, {
    method: "get",
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true,
  });
  var status = exportRes.getResponseCode();
  Logger.log("[pkgpdf] exportStatus=" + status);
  if (status < 200 || status >= 300) {
    var errText = "";
    try {
      errText = exportRes.getContentText();
    } catch (e) {
      errText = safeString(e);
    }
    try {
      updatePackageOutputUrls_(id, { pdf_status: "failed" });
    } catch (statusErr) {
      Logger.log("package_outputs pdf_status update failed: " + safeString(statusErr));
    }
    return {
      ok: true,
      diagnosisId: id,
      docId: docId,
      docUrl: docUrl,
      docGenerated: true,
      pdfGenerated: false,
      pdfError: "Drive export failed: " + status,
      debug: {
        exportedPdfSourceFileId: exportedPdfSourceFileId,
        status: status,
        body: errText,
      },
    };
  }

  var pdfBlob = exportRes.getBlob().setName(fileNameBase + ".pdf");
  var pdfFile = folder ? folder.createFile(pdfBlob) : DriveApp.createFile(pdfBlob);

  var pdfUrl = pdfFile.getUrl();

  try {
    updatePackageOutputUrls_(id, { pdf_url: pdfUrl, pdf_status: "generated" });
  } catch (writeErr2) {
    Logger.log("package_outputs update failed: " + safeString(writeErr2));
  }

  return {
    ok: true,
    diagnosisId: id,
    docId: docId,
    docUrl: docUrl,
    pdfFileId: pdfFile.getId(),
    pdfUrl: pdfUrl,
    docGenerated: true,
    pdfGenerated: true,
  };
}

function updatePackageOutputUrls_(diagnosisId, updates) {
  var id = safeString(diagnosisId).trim();
  if (!id) return;

  var pkgSheet = getOrCreateSheet_(PACKAGE_SHEET_NAME, getPackageHeaders());
  var all = pkgSheet.getDataRange().getValues();
  if (!all || all.length < 2) return;

  var headersRow = all[0].map(function (v) { return safeString(v).trim(); });
  var idIdx = headersRow.indexOf("diagnosis_id");
  if (idIdx < 0) return;

  var lastRowIndex = -1;
  for (var rr = 1; rr < all.length; rr++) {
    if (safeString(all[rr][idIdx]).trim() === id) lastRowIndex = rr;
  }
  if (lastRowIndex < 1) return;

  Object.keys(updates || {}).forEach(function (key) {
    var col = headersRow.indexOf(key);
    if (col < 0) return;
    pkgSheet.getRange(lastRowIndex + 1, col + 1).setValue(safeString(updates[key]));
  });

  try {
    syncOperationDashboard_(id);
  } catch (syncErr) {
    Logger.log("operation_dashboard sync failed: " + safeString(syncErr));
  }

  try {
    refreshOperationDashboard();
  } catch (refreshErr2) {
    Logger.log("refreshOperationDashboard failed: " + safeString(refreshErr2));
  }
}

function ensureHeaders(sheet, headers) {
  var lastColumn = sheet.getLastColumn();

  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  var existingHeaders = sheet.getRange(1, 1, 1, Math.max(lastColumn, 1)).getValues()[0];
  var hasAnyHeader = existingHeaders.some(function (value) {
    return safeString(value) !== "";
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  var headersToAppend = headers.filter(function (header) {
    return existingHeaders.indexOf(header) === -1;
  });

  if (headersToAppend.length > 0) {
    sheet
      .getRange(1, existingHeaders.length + 1, 1, headersToAppend.length)
      .setValues([headersToAppend]);
  }
}

function getSheetHeaders_(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (v) {
    return safeString(v).trim();
  });
}

function findLastRowIndexByKey_(sheet, keyHeader, keyValue) {
  var id = safeString(keyValue).trim();
  if (!id) return -1;

  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return -1;

  var headers = data[0].map(function (v) { return safeString(v).trim(); });
  var idx = headers.indexOf(keyHeader);
  if (idx < 0) return -1;

  var rows = data.slice(1);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (safeString(rows[i][idx]).trim() === id) return i + 2;
  }
  return -1;
}

function getRowObjectByDiagnosisId_(sheet, diagnosisId, keyHeader) {
  var key = safeString(keyHeader || "diagnosis_id").trim();
  var id = safeString(diagnosisId).trim();
  if (!id) return null;

  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return null;

  var headers = data[0].map(function (v) { return safeString(v).trim(); });
  var idx = headers.indexOf(key);
  if (idx < 0) return null;

  var rows = data.slice(1);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (safeString(rows[i][idx]).trim() === id) {
      return { headers: headers, row: rows[i], rowIndex: i + 2 };
    }
  }
  return null;
}

function buildOperationDashboardRecord_(diagnosisId) {
  var id = safeString(diagnosisId).trim();
  if (!id) return null;

  var diagnosisSheet = getDiagnosisSheet();
  var diagnosisFound = findRowByDiagnosisId_(diagnosisSheet, id);
  var followup = getLatestFollowup_(id);
  var pkg = getLatestPackage_(id);

  var diagnosisHeaders = diagnosisFound ? diagnosisFound.headers : [];
  var diagnosisRow = diagnosisFound ? diagnosisFound.row : null;
  var followupHeaders = followup ? followup.headers : [];
  var followupRow = followup ? followup.row : null;
  var pkgHeaders = pkg ? pkg.headers : [];
  var pkgRow = pkg ? pkg.row : null;

  function gv(headers, row, key) {
    if (!headers || !row) return "";
    var i = headers.indexOf(key);
    if (i < 0) return "";
    return safeString(row[i]);
  }

  var parentName = diagnosisFound ? operationAliasValue_({
    name: getRowValue_(diagnosisHeaders, diagnosisRow, "name"),
    parent_name: getRowValue_(diagnosisHeaders, diagnosisRow, "parent_name"),
    parentName: getRowValue_(diagnosisHeaders, diagnosisRow, "parentName"),
    guardian_name: getRowValue_(diagnosisHeaders, diagnosisRow, "guardian_name"),
    guardianName: getRowValue_(diagnosisHeaders, diagnosisRow, "guardianName"),
  }, ["parent_name", "parentName", "guardian_name", "guardianName", "name"]) : "";
  var contact = diagnosisFound ? operationAliasValue_({
    email: getRowValue_(diagnosisHeaders, diagnosisRow, "email"),
    contact: getRowValue_(diagnosisHeaders, diagnosisRow, "contact"),
    mail: getRowValue_(diagnosisHeaders, diagnosisRow, "mail"),
  }, ["contact", "email", "mail"]) : "";
  var gradeStage = followup ? operationAliasValue_({
    grade_stage: gv(followupHeaders, followupRow, "grade_stage"),
    grade: gv(followupHeaders, followupRow, "grade"),
    gradeStage: gv(followupHeaders, followupRow, "gradeStage"),
  }, ["grade_stage", "gradeStage", "grade"]) : "";
  var jukuType = followup ? operationAliasValue_({
    juku_type: gv(followupHeaders, followupRow, "juku_type"),
    cramSchool: gv(followupHeaders, followupRow, "cramSchool"),
    cram_school: gv(followupHeaders, followupRow, "cram_school"),
  }, ["juku_type", "cramSchool", "cram_school"]) : "";
  var weeklyFocus = pkg ? gv(pkgHeaders, pkgRow, "weekly_focus") || gv(pkgHeaders, pkgRow, "focus_theme") : "";
  var currentMainProblem = followup ? gv(followupHeaders, followupRow, "current_main_problem") || gv(followupHeaders, followupRow, "main_problem") : "";
  var sacrificedArea = followup ? gv(followupHeaders, followupRow, "sacrificed_area") || gv(followupHeaders, followupRow, "hardest_tradeoff") : "";
  var studyEndTime = followup ? gv(followupHeaders, followupRow, "study_end_time") || gv(followupHeaders, followupRow, "weekday_end_time") : "";
  var hardestSubject = followup ? gv(followupHeaders, followupRow, "hardest_subject") || gv(followupHeaders, followupRow, "weak_subject") : "";
  var docsUrl = pkg ? operationAliasValue_({
    doc_url: gv(pkgHeaders, pkgRow, "doc_url"),
    docs_url: gv(pkgHeaders, pkgRow, "docs_url"),
    document_url: gv(pkgHeaders, pkgRow, "document_url"),
    google_docs_url: gv(pkgHeaders, pkgRow, "google_docs_url"),
  }, ["doc_url", "docs_url", "document_url", "google_docs_url"]) : "";
  var pdfUrl = pkg ? gv(pkgHeaders, pkgRow, "pdf_url") : "";
  var deliveryStatus = pkg ? gv(pkgHeaders, pkgRow, "pdf_status") : "";
  if (!deliveryStatus) {
    deliveryStatus = docsUrl ? "generated" : "not_started";
  }

  return {
    created_at: new Date().toISOString(),
    diagnosis_id: id,
    parent_name: parentName,
    contact: contact,
    grade_stage: gradeStage,
    juku_type: jukuType,
    weekly_focus: weeklyFocus,
    current_main_problem: currentMainProblem,
    sacrificed_area: sacrificedArea,
    study_end_time: studyEndTime,
    hardest_subject: hardestSubject,
    docs_url: docsUrl,
    pdf_url: pdfUrl,
    wechat_status: "not_contacted",
    payment_status: "unpaid",
    delivery_status: deliveryStatus,
    sent_at: "",
    operator_memo: "",
  };
}

function upsertOperationDashboard_(diagnosisId, updates, preserveStatusFields) {
  var id = safeString(diagnosisId).trim();
  if (!id) return false;

  var sheet = getOperationDashboardSheet();
  ensureHeaders(sheet, getOperationDashboardHeaders());
  var data = sheet.getDataRange().getValues();
  var headers = data && data.length > 0 ? data[0].map(function (v) { return safeString(v).trim(); }) : getOperationDashboardHeaders();
  var existingRowIndex = findLastRowIndexByKey_(sheet, "diagnosis_id", id);
  var record = buildOperationDashboardRecord_(id);
  if (!record && !existingRowIndex) return false;

  var existing = {};
  if (existingRowIndex > 1) {
    var rowValues = sheet.getRange(existingRowIndex, 1, 1, headers.length).getValues()[0];
    headers.forEach(function (header, idx) {
      existing[header] = safeString(rowValues[idx]);
    });
  }

  var allowedStatusFields = {
    wechat_status: true,
    payment_status: true,
    delivery_status: true,
    sent_at: true,
    operator_memo: true,
  };
  var preserve = preserveStatusFields === true;
  var output = {};
  headers.forEach(function (header) {
    if (header === "created_at") {
      output[header] = existing[header] || safeString(record && record.created_at);
      return;
    }
    if (header === "diagnosis_id") {
      output[header] = id;
      return;
    }
    if (header === "wechat_status" || header === "payment_status" || header === "sent_at" || header === "operator_memo") {
      if (preserve && existing[header]) {
        output[header] = existing[header];
      } else if (updates && updates.hasOwnProperty(header) && safeString(updates[header]).trim() !== "") {
        output[header] = safeString(updates[header]);
      } else if (existing[header]) {
        output[header] = existing[header];
      } else if (record && record[header]) {
        output[header] = safeString(record[header]);
      } else {
        output[header] = header === "wechat_status" ? "not_contacted" : (header === "payment_status" ? "unpaid" : "");
      }
      return;
    }
    if (header === "delivery_status") {
      if (preserve && existing[header] === "sent") {
        output[header] = "sent";
      } else if (updates && updates.hasOwnProperty(header) && safeString(updates[header]).trim() !== "") {
        output[header] = safeString(updates[header]);
      } else if (record && record[header]) {
        output[header] = safeString(record[header]);
      } else {
        output[header] = existing[header] || "not_started";
      }
      return;
    }

    if (updates && updates.hasOwnProperty(header) && safeString(updates[header]).trim() !== "") {
      output[header] = safeString(updates[header]);
      return;
    }
    if (record && record.hasOwnProperty(header)) {
      output[header] = safeString(record[header]);
      return;
    }
    output[header] = existing[header] || "";
  });

  var row = headers.map(function (header) {
    return safeString(output[header]);
  });

  if (existingRowIndex > 1) {
    sheet.getRange(existingRowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return true;
}

function syncOperationDashboard_(diagnosisId, preserveStatusFields) {
  var result = upsertOperationDashboard_(diagnosisId, {}, preserveStatusFields !== false);
  try {
    refreshOperationDashboard();
  } catch (refreshErr) {
    Logger.log("refreshOperationDashboard failed: " + safeString(refreshErr));
  }
  return result;
}

function updateOperationStatus(diagnosisId, updates) {
  var id = safeString(diagnosisId).trim();
  if (!id) return { ok: false, error: "BAD_REQUEST" };

  var allowed = {
    wechat_status: true,
    payment_status: true,
    delivery_status: true,
    sent_at: true,
    operator_memo: true,
  };
  var safeUpdates = {};
  Object.keys(updates || {}).forEach(function (key) {
    if (allowed[key]) safeUpdates[key] = updates[key];
  });
  upsertOperationDashboard_(id, safeUpdates, true);
  try {
    refreshOperationDashboard();
  } catch (refreshErr) {
    Logger.log("refreshOperationDashboard failed: " + safeString(refreshErr));
  }
  return { ok: true, diagnosisId: id };
}

function markPackageSent(diagnosisId) {
  var id = safeString(diagnosisId).trim();
  if (!id) return { ok: false, error: "BAD_REQUEST" };
  return updateOperationStatus(id, {
    delivery_status: "sent",
    sent_at: new Date().toISOString(),
  });
}

function markPaymentPaid(diagnosisId) {
  var id = safeString(diagnosisId).trim();
  if (!id) return { ok: false, error: "BAD_REQUEST" };
  return updateOperationStatus(id, {
    payment_status: "paid",
  });
}

function checkPackageQuality(diagnosisId) {
  var id = safeString(diagnosisId).trim();
  if (!id) return { ok: false, error: "BAD_REQUEST", error_message: "diagnosisId is required" };

  var pkg = getLatestPackage_(id);
  if (!pkg) {
    appendPackageQualityChecks_([[
      new Date().toISOString(),
      id,
      "failed",
      "not_found",
      "package_outputs not found for diagnosisId",
      "diagnosis_id",
      "",
      "",
      "",
      "mark_delivery_failed",
    ]]);
    try {
      updateOperationStatus(id, {
        delivery_status: "failed",
      });
      refreshOperationDashboard();
    } catch (errNotFound) {
      Logger.log("quality check not_found fallback failed: " + safeString(errNotFound));
    }
    return { ok: false, result: "failed", error_type: "not_found" };
  }

  var pkgHeaders = pkg.headers || [];
  var pkgRow = pkg.row || [];
  var analysis = detectPackageQualityIssues_(pkgHeaders, pkgRow);
  var checkedAt = new Date().toISOString();
  var weeklyFocus = getPackageValueByAliases_(pkgHeaders, pkgRow, ["weekly_focus", "focus_theme"]);
  var docsUrl = getPackageValueByAliases_(pkgHeaders, pkgRow, ["docs_url", "doc_url", "document_url", "google_docs_url"]);

  if (analysis.issues.length > 0) {
    var qualityRows = analysis.issues.map(function (issue) {
      return [
        checkedAt,
        id,
        issue.result || "failed",
        issue.error_type || "UNKNOWN",
        issue.error_message || "",
        issue.field_name || "",
        issue.detected_value || "",
        weeklyFocus,
        docsUrl,
        "mark_delivery_failed",
      ];
    });
    appendPackageQualityChecks_(qualityRows);
    try {
      updateOperationStatus(id, {
        delivery_status: "failed",
        operator_memo: qualityRows[0][4],
      });
      refreshOperationDashboard();
    } catch (failErr) {
      Logger.log("quality failure dashboard update failed: " + safeString(failErr));
    }
    return {
      ok: false,
      result: "failed",
      diagnosisId: id,
      issues: analysis.issues,
    };
  }

  appendPackageQualityChecks_([[
    checkedAt,
    id,
    "passed",
    "",
    "",
    "",
    "",
    weeklyFocus,
    docsUrl,
    "none",
  ]]);

  return {
    ok: true,
    result: "passed",
    diagnosisId: id,
  };
}

function clearOperationDashboardTestRows_() {
  var sheet = getOperationDashboardSheet();
  ensureHeaders(sheet, getOperationDashboardHeaders());
  var headers = getOperationDashboardHeaders();
  var data = sheet.getDataRange().getValues();
  var prefix = "SEED-OP-V2-";
  var deleted = 0;

  if (data && data.length >= 2) {
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      var id = safeString(row[headers.indexOf("diagnosis_id")]).trim();
      if (id.indexOf(prefix) === 0) {
        sheet.deleteRow(i + 1);
        deleted++;
      }
    }
  }

  return {
    ok: true,
    deleted: deleted,
    prefix: prefix,
  };
}

function seedPackageQualityTestRows_() {
  var packageSheet = getOrCreateSheet_(PACKAGE_SHEET_NAME, getPackageHeaders());
  ensureHeaders(packageSheet, getPackageHeaders());
  var headers = getPackageHeaders();
  var data = packageSheet.getDataRange().getValues();
  var prefix = "QCHK-V2-";
  var deleted = 0;

  if (data && data.length >= 2) {
    for (var i = data.length - 1; i >= 1; i--) {
      var rowId = safeString(data[i][headers.indexOf("diagnosis_id")]).trim();
      if (rowId.indexOf(prefix) === 0) {
        packageSheet.deleteRow(i + 1);
        deleted++;
      }
    }
  }

  var now = new Date().toISOString();
  var seedRows = [
    {
      created_at: now,
      diagnosis_id: prefix + "PASS",
      diagnosis_type: "作业取舍",
      main_summary: "当前最主要的问题不是单纯作业多，而是作业、复习、订正和先后顺序已经开始互相挤压。",
      keep_1: "塾必须提交、老师会检查的作业",
      keep_2: "算数中最卡的2〜3个问题",
      keep_3: "每天10分钟，把当天没弄懂的地方重新看一遍",
      reduce_1: "已经连续做对、明显熟练的重复题",
      reduce_2: "晚上临时想到又加上的任务",
      reduce_3: "本周新增的市販问题集或额外打印题",
      parent_do_1: "先把本周塾作业分成三类：必须提交、需要完成、可以暂缓。",
      parent_do_2: "每天先确认今天最重要的一件事",
      parent_stop_1: "不要临时再加任务。",
      parent_stop_2: "不要为了填满时间而继续追加。",
      child_focus: "算数中最卡的2〜3个问题，重新弄明白",
      observation_1: "临时增加的任务有没有变少？",
      observation_2: "今天有没有留出10分钟，把错题或没懂的地方重新看一遍？",
      observation_3: "本周有没有把“必须做”和“可以暂缓”分开？",
      weekly_focus: "作业取舍",
      surface_problem: "作业做不完",
      real_problem: "不是单纯作业太多，而是作业占掉了本该用于复习和整理的时间。",
      docs_url: "https://docs.google.com/document/d/qchk-pass",
      pdf_url: "",
      payment_status: "",
      pdf_status: "",
      sent_status: "",
    },
    {
      created_at: now,
      diagnosis_id: prefix + "MISSING",
      diagnosis_type: "作业取舍",
      main_summary: "缺字段验收",
      keep_1: "保留项",
      keep_2: "保留项2",
      reduce_1: "减少项",
      reduce_2: "减少项2",
      parent_do_1: "家长做",
      parent_do_2: "家长做2",
      parent_stop_1: "家长不要做",
      parent_stop_2: "家长不要做2",
      child_focus: "孩子只练",
      observation_1: "观察1",
      observation_2: "观察2",
      observation_3: "观察3",
      weekly_focus: "",
      surface_problem: "",
      real_problem: "",
      keep_3: "",
      reduce_3: "",
      docs_url: "https://docs.google.com/document/d/qchk-missing",
      pdf_url: "",
    },
    {
      created_at: now,
      diagnosis_id: prefix + "PLACEHOLDER",
      diagnosis_type: "作业取舍",
      main_summary: "模板变量验收",
      keep_1: "{{parent_name}}",
      keep_2: "保留项2",
      keep_3: "保留项3",
      reduce_1: "减少项1",
      reduce_2: "减少项2",
      reduce_3: "减少项3",
      parent_do_1: "家长做1",
      parent_do_2: "家长做2",
      parent_stop_1: "家长不要做1",
      parent_stop_2: "家长不要做2",
      child_focus: "孩子只练1",
      observation_1: "观察1",
      observation_2: "观察2",
      observation_3: "观察3",
      weekly_focus: "作业取舍",
      surface_problem: "看起来的问题",
      real_problem: "真正的问题",
      docs_url: "https://docs.google.com/document/d/qchk-placeholder",
      pdf_url: "",
    },
    {
      created_at: now,
      diagnosis_id: prefix + "BANNED",
      diagnosis_type: "作业取舍",
      main_summary: "禁用词验收",
      keep_1: "保留项1",
      keep_2: "保留项2",
      keep_3: "保留项3",
      reduce_1: "减少项1",
      reduce_2: "减少项2",
      reduce_3: "减少项3",
      parent_do_1: "家长做1",
      parent_do_2: "家长做2",
      parent_stop_1: "家长不要做1",
      parent_stop_2: "家长不要做2",
      child_focus: "孩子只练1",
      observation_1: "观察1",
      observation_2: "观察2",
      observation_3: "观察3",
      weekly_focus: "作业取舍",
      surface_problem: "学习结构开始失衡",
      real_problem: "不要用AI分析来保证提升",
      docs_url: "https://docs.google.com/document/d/qchk-banned",
      pdf_url: "",
    },
    {
      created_at: now,
      diagnosis_id: prefix + "WEEKLY",
      diagnosis_type: "作业取舍",
      main_summary: "weekly_focus 非法值验收",
      keep_1: "保留项1",
      keep_2: "保留项2",
      keep_3: "保留项3",
      reduce_1: "减少项1",
      reduce_2: "减少项2",
      reduce_3: "减少项3",
      parent_do_1: "家长做1",
      parent_do_2: "家长做2",
      parent_stop_1: "家长不要做1",
      parent_stop_2: "家长不要做2",
      child_focus: "孩子只练1",
      observation_1: "观察1",
      observation_2: "观察2",
      observation_3: "观察3",
      weekly_focus: "成绩提升",
      surface_problem: "看起来的问题",
      real_problem: "真正的问题",
      docs_url: "https://docs.google.com/document/d/qchk-weekly",
      pdf_url: "",
    },
  ];

  for (var j = 0; j < seedRows.length; j++) {
    var seed = seedRows[j];
    var rowValues = headers.map(function (header) {
      return safeString(seed[header]);
    });
    packageSheet.appendRow(rowValues);
  }

  return {
    ok: true,
    deleted: deleted,
    inserted: seedRows.length,
    prefix: prefix,
  };
}

function runSeedPackageQualityTestRows() {
  return seedPackageQualityTestRows_();
}

function clearPackageQualityTestRows_() {
  var prefix = "QCHK-V2-";
  var targets = [
    { sheet: getOrCreateSheet_(PACKAGE_SHEET_NAME, getPackageHeaders()), headers: getPackageHeaders() },
    { sheet: getPackageQualitySheet(), headers: getPackageQualityHeaders() },
    { sheet: getOperationDashboardSheet(), headers: getOperationDashboardHeaders() },
  ];
  var deleted = {};

  for (var t = 0; t < targets.length; t++) {
    var target = targets[t];
    ensureHeaders(target.sheet, target.headers);
    var data = target.sheet.getDataRange().getValues();
    var count = 0;
    if (data && data.length >= 2) {
      for (var i = data.length - 1; i >= 1; i--) {
        var headers = data[0].map(function (v) { return safeString(v).trim(); });
        var idx = headers.indexOf("diagnosis_id");
        if (idx < 0) continue;
        var id = safeString(data[i][idx]).trim();
        if (id.indexOf(prefix) === 0) {
          target.sheet.deleteRow(i + 1);
          count++;
        }
      }
    }
    deleted[target.sheet.getName()] = count;
  }

  try {
    refreshOperationDashboard();
  } catch (refreshErr) {
    Logger.log("refreshOperationDashboard failed after clearing package quality seed rows: " + safeString(refreshErr));
  }

  return {
    ok: true,
    deleted: deleted,
    prefix: prefix,
  };
}

function runClearPackageQualityTestRows() {
  return clearPackageQualityTestRows_();
}

function runLatestPackageQualityCheck() {
  var latestId = getLatestPackageDiagnosisId_();
  if (!latestId) {
    return { ok: false, error: "NO_LATEST_PACKAGE" };
  }
  return checkPackageQuality(latestId);
}

function sendDiagnosisMail(payload) {
  var to = safeString(payload.email).trim();
  if (!to) return false;

  var language = safeString(payload.language).trim() || "jp";
  if (language === "cn") {
    return sendDiagnosisMailCn(payload, to);
  }

  return sendDiagnosisMailJa(payload, to);
}

function sendDiagnosisMailJa(payload, to) {
  var rawName = safeString(payload.name || payload.parentName).trim();
  var nameOrFallback = rawName ? (rawName + " 様") : "保護者様";

  var mailState = ensureJapanesePeriod(String(payload.mailCurrentTrend || "").trim());
  var mailPoints = pickSituationItems(payload.mailCauses, 3);
  var mailNextAction = ensureJapanesePeriod(String(payload.mailThisWeekActions || "").trim());

  var subject = "【診断結果】家庭学習の状態を整理しました";

  var body =
    nameOrFallback +
    "\n\n" +
    "診断結果をご確認いただきありがとうございます。\n\n" +
    "現在、\n" +
    mailState +
    "\n\n" +
    (mailPoints.length
      ? "特に、\n\n" + mailPoints.map(function (p) { return "・" + p; }).join("\n") + "\n\n"
      : "") +
    "ただ、\n" +
    "努力不足というより、\n" +
    "家庭学習の回し方の問題として起きやすい状態です。\n\n" +
    mailNextAction +
    "\n\n" +
    "必要であれば、\n" +
    "LINEで現在の状況を整理できます。\n\n" +
    "LINE：https://lin.ee/pxHFmsI\n\n" +
    (safeString(payload.diagnosisId).trim()
      ? "\n診断ID：" + safeString(payload.diagnosisId).trim() + "\nLINEでご相談いただく際は、この診断IDをお送りください。\n"
      : "") +
    "※本診断は、家庭学習の状態整理を目的とした簡易診断です。";

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
  });

  return true;
}

function sendDiagnosisMailCn(payload, to) {
  // CN mail must not include Japanese templates or LINE copy.
  var subject = "【诊断结果】家庭学习状态整理";

  var topRisks = parseTopRisks(payload);
  var topRiskLines = buildCnTopRiskLines(topRisks);

  var body =
    "家长您好\n\n" +
    "感谢您完成「中学受験家庭学习整理」诊断。\n\n" +
    "从这次结果看，\n" +
    "您家现在的问题，\n" +
    "不太像是孩子单纯不努力。\n\n" +
    "更像是：\n" +
    "每天都在学，\n" +
    "但作业、复习、订正和考试准备之间，\n" +
    "已经开始互相挤压。\n\n" +
    "这次最需要先关注的是：\n\n" +
    (topRiskLines.length ? topRiskLines.map(function (l) { return "• " + l; }).join("\n") : "• （暂无明显集中项）") +
    "\n\n" +
    "如果不先整理顺序，\n" +
    "很容易变成：\n" +
    "家长一直在催，\n" +
    "孩子一直在赶，\n" +
    "但真正该回头整理的内容越来越靠后。\n\n" +
    "现在不建议马上继续加量。\n\n" +
    "更应该先确认：\n\n" +
    "1. 本周最该优先的是什么\n" +
    "2. 哪些任务可以暂时减少\n" +
    "3. 家长该介入到什么程度\n" +
    "4. 复习和订正怎么重新放回日常节奏里\n\n" +
    "如果你想进一步确认：\n" +
    "你家现在到底应该先调整哪里，\n" +
    "可以添加微信，把诊断结果截图发来。\n\n" +
    "请一起发送：\n\n" +
    "1. 孩子年级\n" +
    "2. 所在塾\n" +
    "3. 当前最困扰的一件事\n\n" +
    "微信号：\n" +
    "Juken-family\n\n" +
    (safeString(payload.diagnosisId).trim() ? "\n诊断ID：" + safeString(payload.diagnosisId).trim() + "\n（咨询时请一并发送该诊断ID）\n" : "") +
    "※本诊断面向在日华人中学受験家庭，用于整理家庭学习安排。";

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
  });

  return true;
}

function lookupDiagnosis(payload) {
  var diagnosisId = safeString(payload && payload.diagnosisId).trim();
  if (!diagnosisId) return { ok: false, error: "BAD_REQUEST" };

  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getDiagnosisSheet();
  var dataRange = sheet.getDataRange();
  var allValues = dataRange.getValues();
  if (!allValues || allValues.length < 2 || !allValues[0] || allValues[0].length < 1) {
    return {
      ok: false,
      error: "NOT_FOUND",
      debug: {
        activeSheetName: SHEET_NAME,
        headerCount: 0,
        requestedDiagnosisId: diagnosisId,
        diagnosisIdHeaderFound: false,
        diagnosisIdColumnIndex: -1,
        scannedRows: 0,
      },
    };
  }

  var headers = allValues[0].map(function (v) { return safeString(v).trim(); });
  var headerCount = headers.length;
  var diagnosisIdHeaderIndexes = [];
  for (var hi = 0; hi < headers.length; hi++) {
    if (headers[hi] === "diagnosisId") diagnosisIdHeaderIndexes.push(hi);
  }
  var idx = headers.indexOf("diagnosisId");
  if (idx < 0) {
    return {
      ok: false,
      error: "NOT_FOUND",
      debug: {
        activeSheetName: SHEET_NAME,
        headerCount: headerCount,
        requestedDiagnosisId: diagnosisId,
        diagnosisIdHeaderFound: false,
        diagnosisIdColumnIndex: -1,
        diagnosisIdHeaderIndexes: diagnosisIdHeaderIndexes,
        diagnosisIdColumnHeaderValue: "",
        diagnosisIdCellValue: "",
        scannedRows: allValues.length - 1,
      },
    };
  }

  var rows = allValues.slice(1);
  var found = null;
  for (var r = 0; r < rows.length; r++) {
    if (safeString(rows[r][idx]).trim() === diagnosisId) {
      found = rows[r];
      break;
    }
  }
  if (!found) {
    var lastCellValue = "";
    if (rows.length) lastCellValue = safeString(rows[rows.length - 1][idx]).trim();
    return {
      ok: false,
      error: "NOT_FOUND",
      debug: {
        activeSheetName: SHEET_NAME,
        headerCount: headerCount,
        requestedDiagnosisId: diagnosisId,
        diagnosisIdHeaderFound: true,
        diagnosisIdColumnIndex: idx,
        diagnosisIdHeaderIndexes: diagnosisIdHeaderIndexes,
        diagnosisIdColumnHeaderValue: safeString(headers[idx]),
        diagnosisIdCellValue: lastCellValue,
        scannedRows: rows.length,
      },
    };
  }

  function get(key) {
    var i = headers.indexOf(key);
    if (i < 0) return "";
    return safeString(found[i]);
  }

  var answersRaw = get("answersJson");
  var answers = null;
  var warning = "";
  if (answersRaw) {
    try {
      answers = JSON.parse(answersRaw);
    } catch (e) {
      answers = null;
      warning = "answersJson_parse_failed";
    }
  }

  var diagnosis = {
    diagnosisId: diagnosisId,
    submittedAt: get("submittedAt"),
    parentName: get("name"),
    email: get("email"),
    diagnosisType: get("diagnosisType"),
    diagnosisLabel: get("diagnosisLabel"),
    overallRisk: Number(get("overallRisk") || 0),
    dimensions: {
      homework_load: Number(get("homework_load") || 0),
      review_retention: Number(get("review_retention") || 0),
      planning: Number(get("planning") || 0),
      parent_involvement: Number(get("parent_involvement") || 0),
      autonomy: Number(get("autonomy") || 0),
      mental_load: Number(get("mental_load") || 0),
    },
    answers: answers,
    thisWeekAction: get("thisWeekAction") || get("mailThisWeekActions"),
    language: get("language"),
  };

  return {
    ok: true,
    diagnosis: diagnosis,
    debug: {
      activeSheetName: SHEET_NAME,
      headerCount: headerCount,
      requestedDiagnosisId: diagnosisId,
      diagnosisIdHeaderFound: true,
      diagnosisIdColumnIndex: idx,
      diagnosisIdHeaderIndexes: diagnosisIdHeaderIndexes,
      diagnosisIdColumnHeaderValue: safeString(headers[idx]),
      diagnosisIdCellValue: safeString(found[idx]).trim(),
      scannedRows: rows.length,
    },
    warning: warning || undefined,
  };
}

function findRowByDiagnosisId_(sheet, diagnosisId) {
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return null;
  var headers = data[0].map(function (v) { return safeString(v).trim(); });
  var idx = headers.indexOf("diagnosisId");
  if (idx < 0) return null;
  var rows = data.slice(1);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (safeString(rows[i][idx]).trim() === diagnosisId) return { headers: headers, row: rows[i] };
  }
  return null;
}

function getRowValue_(headers, row, key) {
  var i = headers.indexOf(key);
  if (i < 0) return "";
  return safeString(row[i]);
}

function getLatestFollowup_(diagnosisId) {
  var sheet = getOrCreateSheet_(FOLLOWUP_SHEET_NAME, getFollowupHeaders());
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return null;
  var headers = data[0].map(function (v) { return safeString(v).trim(); });
  var idIdx = headers.indexOf("diagnosis_id");
  if (idIdx < 0) return null;
  var rows = data.slice(1);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (safeString(rows[i][idIdx]).trim() === diagnosisId) {
      return { headers: headers, row: rows[i] };
    }
  }
  return null;
}

function resetSheetWithHeaders_(sheet, headers) {
  if (!sheet) return;
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function parseDateSafe_(value) {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  var d = new Date(value);
  if (d instanceof Date && !isNaN(d.getTime())) return d;
  return null;
}

function startOfCurrentWeek_(date) {
  var d = new Date(date || new Date());
  d.setHours(0, 0, 0, 0);
  var day = d.getDay(); // 0=Sun ... 6=Sat
  var diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d;
}

function isWithinCurrentWeek_(value) {
  var d = parseDateSafe_(value);
  if (!d) return false;
  var now = new Date();
  var start = startOfCurrentWeek_(now);
  var end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

function getOperationDashboardRows_() {
  var sheet = getOperationDashboardSheet();
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return [];
  var headers = data[0].map(function (v) { return safeString(v).trim(); });
  var rows = data.slice(1);
  return rows.map(function (row) {
    var obj = {};
    headers.forEach(function (header, idx) {
      obj[header] = safeString(row[idx]);
    });
    return normalizeOperationRow_(obj);
  }).filter(function (row) {
    return safeString(row.diagnosis_id).trim() !== "";
  });
}

function writeTableRows_(sheet, headers, rows) {
  resetSheetWithHeaders_(sheet, headers);
  if (!rows || !rows.length) return;
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function buildOperationSummaryRows_(dashboardRows, warnings) {
  var now = new Date().toISOString();
  var counts = {
    this_week_diagnosis_count: 0,
    this_week_followup_count: 0,
    waiting_contact_count: 0,
    waiting_payment_count: 0,
    waiting_delivery_count: 0,
    generated_not_sent_count: 0,
    paid_count: 0,
    sent_count: 0,
  };

  var diagnosisSheet = getDiagnosisSheet();
  var diagnosisData = diagnosisSheet.getDataRange().getValues();
  if (diagnosisData && diagnosisData.length >= 2) {
    var diagnosisHeaders = diagnosisData[0].map(function (v) { return safeString(v).trim(); });
    var submittedAtIdx = diagnosisHeaders.indexOf("submittedAt");
    if (submittedAtIdx < 0) submittedAtIdx = diagnosisHeaders.indexOf("submitted_at");
    if (submittedAtIdx < 0) submittedAtIdx = diagnosisHeaders.indexOf("created_at");
    if (submittedAtIdx < 0) submittedAtIdx = diagnosisHeaders.indexOf("createdAt");
    if (submittedAtIdx >= 0) {
      for (var i = 1; i < diagnosisData.length; i++) {
        if (isWithinCurrentWeek_(diagnosisData[i][submittedAtIdx])) counts.this_week_diagnosis_count++;
      }
    } else if (warnings) {
      warnings.push("diagnosis sheet missing submittedAt header");
    }
  }

  var followupSheet = getOrCreateSheet_(FOLLOWUP_SHEET_NAME, getFollowupHeaders());
  var followupData = followupSheet.getDataRange().getValues();
  if (followupData && followupData.length >= 2) {
    var followupHeaders = followupData[0].map(function (v) { return safeString(v).trim(); });
    var followCreatedIdx = followupHeaders.indexOf("created_at");
    if (followCreatedIdx < 0) followCreatedIdx = followupHeaders.indexOf("createdAt");
    if (followCreatedIdx < 0) followCreatedIdx = followupHeaders.indexOf("submittedAt");
    if (followCreatedIdx >= 0) {
      for (var j = 1; j < followupData.length; j++) {
        if (isWithinCurrentWeek_(followupData[j][followCreatedIdx])) counts.this_week_followup_count++;
      }
    } else if (warnings) {
      warnings.push("followup sheet missing created_at header");
    }
  }

  for (var r = 0; r < dashboardRows.length; r++) {
    var row = dashboardRows[r];
    var wechat = normalizeWechatStatus_(row.wechat_status);
    var payment = normalizePaymentStatus_(row.payment_status);
    var delivery = normalizeDeliveryStatus_(row.delivery_status);
    var docsUrl = safeString(row.docs_url).trim();
    var pdfUrl = safeString(row.pdf_url).trim();
    if (wechat === "not_contacted") counts.waiting_contact_count++;
    if ((wechat === "contacted" || wechat === "requested_package" || wechat === "converted") && payment !== "paid") counts.waiting_payment_count++;
    if (payment === "paid" && delivery !== "sent") counts.waiting_delivery_count++;
    if (docsUrl && delivery !== "sent") counts.generated_not_sent_count++;
    if (payment === "paid") counts.paid_count++;
    if (delivery === "sent") counts.sent_count++;
    if (pdfUrl && !docsUrl && warnings) {
      warnings.push("row " + safeString(row.diagnosis_id) + " has pdf_url without docs_url");
    }
  }

  var summaryMap = [
    ["this_week_diagnosis_count", "本周诊断提交数", counts.this_week_diagnosis_count, "本周诊断表提交总数"],
    ["this_week_followup_count", "本周 followup 提交数", counts.this_week_followup_count, "本周补充问卷提交总数"],
    ["waiting_contact_count", "待联系数量", counts.waiting_contact_count, "尚未联系的订单"],
    ["waiting_payment_count", "已联系但未付款数量", counts.waiting_payment_count, "已联系但还没付款的订单"],
    ["waiting_delivery_count", "已付款但未发送数量", counts.waiting_delivery_count, "已付款但还没发送的订单"],
    ["generated_not_sent_count", "已生成 Docs 但未发送数量", counts.generated_not_sent_count, "Docs 已生成但还没发送的订单"],
    ["paid_count", "已付款总数", counts.paid_count, "累计已付款订单数"],
    ["sent_count", "已发送总数", counts.sent_count, "累计已发送订单数"],
  ];

  return summaryMap.map(function (item) {
    return [item[0], item[1], String(item[2]), now, item[3]];
  });
}

function buildOperationTodoRows_(dashboardRows, warnings) {
  var now = new Date().toISOString();
  var rows = [];

  function addRow(priority, todoType, row, reason) {
    rows.push([
      priority,
      todoType,
      safeString(row.diagnosis_id),
      safeString(row.parent_name),
      safeString(row.grade_stage || row.grade),
      safeString(row.wechat_status),
      safeString(row.payment_status),
      safeString(row.delivery_status),
      safeString(row.docs_url),
      reason,
      safeString(row.created_at),
      now,
    ]);
  }

  for (var i = 0; i < dashboardRows.length; i++) {
    var row = dashboardRows[i];
    var wechat = normalizeWechatStatus_(row.wechat_status);
    var payment = normalizePaymentStatus_(row.payment_status);
    var delivery = normalizeDeliveryStatus_(row.delivery_status);
    var docsUrl = safeString(row.docs_url).trim();

    if (delivery === "failed" || (!docsUrl && (payment === "paid" || wechat === "converted"))) {
      addRow("P4", "生成异常", row, delivery === "failed" ? "整理包生成或交付状态异常，需要人工检查。" : "Docs 链接缺失或生成状态不完整，需要人工检查。");
      continue;
    }
    if (payment === "paid" && delivery !== "sent") {
      addRow("P1", "已付款待发送", row, "已付款，但整理包尚未发送。需要优先处理。");
      continue;
    }
    if (docsUrl && wechat === "not_contacted") {
      addRow("P2", "已生成但未联系", row, "整理包已生成，但尚未联系家长。");
      continue;
    }
    if ((wechat === "contacted" || wechat === "requested_package") && payment !== "paid" && delivery !== "sent") {
      addRow("P3", "已联系未付款", row, "已联系但未付款，需要跟进付款或判断是否放弃。");
      continue;
    }
  }

  rows.sort(function (a, b) {
    var order = { P1: 1, P2: 2, P3: 3, P4: 4 };
    if (order[a[0]] !== order[b[0]]) return order[a[0]] - order[b[0]];
    return String(b[10]).localeCompare(String(a[10]));
  });
  return rows;
}

function refreshOperationDashboard() {
  var warnings = [];
  var dashboardSheet = getOperationDashboardSheet();
  var dashboardRows = getOperationDashboardRows_();

  // Ensure the dashboard sheet exists even when there are no rows.
  ensureHeaders(dashboardSheet, getOperationDashboardHeaders());

  var summarySheet = getOperationSummarySheet();
  var todoSheet = getOperationTodoSheet();

  var summaryRows = buildOperationSummaryRows_(dashboardRows, warnings);
  var todoRows = buildOperationTodoRows_(dashboardRows, warnings);

  writeTableRows_(summarySheet, getOperationSummaryHeaders(), summaryRows);
  writeTableRows_(todoSheet, getOperationTodoHeaders(), todoRows);

  Logger.log("refreshOperationDashboard done: summary=" + summaryRows.length + ", todo=" + todoRows.length + (warnings.length ? ", warnings=" + warnings.join(" | ") : ""));
  Logger.log("operation_dashboard headers=" + JSON.stringify(getSheetHeaders_(dashboardSheet)));
  Logger.log("operation_dashboard wechat_status values=" + JSON.stringify(sortUniques_(dashboardRows.map(function (r) { return safeString(r.wechat_status).trim(); }).filter(function (v) { return v !== ""; }))));
  Logger.log("operation_dashboard payment_status values=" + JSON.stringify(sortUniques_(dashboardRows.map(function (r) { return safeString(r.payment_status).trim(); }).filter(function (v) { return v !== ""; }))));
  Logger.log("operation_dashboard delivery_status values=" + JSON.stringify(sortUniques_(dashboardRows.map(function (r) { return safeString(r.delivery_status).trim(); }).filter(function (v) { return v !== ""; }))));

  return {
    ok: true,
    summaryCount: summaryRows.length,
    todoCount: todoRows.length,
    warnings: warnings,
  };
}

function normalizePackageType_(diagnosisType) {
  var t = safeString(diagnosisType).trim();
  // Phase 1 only supports 5 templates. Map unknowns to the closest safe bucket.
  if (t === "負荷過多型") return t;
  if (t === "表面努力型") return t;
  if (t === "計画混乱型") return t;
  if (t === "不安定型") return t;
  // 親主導型 is not in legacy diagnosisType; if introduced later, keep it.
  if (t === "親主導型") return t;
  // Fallback: treat other legacy types as 表面努力型 (more neutral) for the early phase.
  return "表面努力型";
}

function topDimensionsFromScores_(dimensions) {
  var pairs = [
    ["homework_load", Number(dimensions.homework_load || 0)],
    ["review_retention", Number(dimensions.review_retention || 0)],
    ["planning", Number(dimensions.planning || 0)],
    ["parent_involvement", Number(dimensions.parent_involvement || 0)],
    ["autonomy", Number(dimensions.autonomy || 0)],
    ["mental_load", Number(dimensions.mental_load || 0)],
  ];
  pairs.sort(function (a, b) { return b[1] - a[1]; });
  return pairs.slice(0, 2).map(function (p) { return p[0]; });
}

function cnLabelForDim_(dim) {
  return cnDimensionLabel(dim);
}

function isLateStudyEndTime_(studyEndTime) {
  var t = safeString(studyEndTime).trim();
  if (!t) return false;
  return t === "22-23点" || t === "23点以后" || t === "22-23時" || t === "23時以降";
}

function isEarlyStudyEndTime_(studyEndTime) {
  var t = safeString(studyEndTime).trim();
  if (!t) return false;
  return t === "20点前" || t === "20-21点" || t === "20時前" || t === "20-21時";
}

function normalizeSubjectCn_(subjectRaw) {
  var s = safeString(subjectRaw).trim();
  if (!s) return "";
  if (s === "没有特别偏科" || s === "特になし" || s === "特に偏りなし") return "";
  // Keep canonical CN labels for output.
  if (s.indexOf("算") >= 0) return "算数";
  if (s.indexOf("国") >= 0) return "国语";
  if (s.indexOf("理") >= 0) return "理科";
  if (s.indexOf("社") >= 0) return "社会";
  return s;
}

function canonicalTradeoffKey_(raw) {
  var s = safeString(raw).trim();
  if (!s) return "";
  if (s.indexOf("塾作业太多") >= 0 || s.indexOf("塾の宿題が多すぎる") >= 0 || s.indexOf("作业") >= 0 || s.indexOf("宿題") >= 0) return "homework_too_much";
  if (s.indexOf("错题整理") >= 0 || s.indexOf("間違えた問題の整理") >= 0 || s.indexOf("错题") >= 0 || s.indexOf("間違い") >= 0) return "mistake_review";
  if (s.indexOf("测试准备") >= 0 || s.indexOf("テスト準備") >= 0 || s.indexOf("测试") >= 0 || s.indexOf("テスト") >= 0 || (s.indexOf("复习") >= 0 && s.indexOf("来不及") >= 0)) return "test_review";
  if (s.indexOf("暗记") >= 0 || s.indexOf("暗記") >= 0) return "memorization";
  if (s.indexOf("睡眠") >= 0 || s.indexOf("休息") >= 0 || s.indexOf("睡眠や休息") >= 0 || s.indexOf("睡眠和休息") >= 0) return "sleep_rest";
  if (s.indexOf("亲子关系") >= 0 || s.indexOf("親子") >= 0 || s.indexOf("余裕") >= 0) return "relationship_margin";
  if (s.indexOf("复习") >= 0 || s.indexOf("復習") >= 0) return "review";
  if (s.indexOf("减量") >= 0 || s.indexOf("減ら") >= 0 || s.indexOf("迷") >= 0) return "parent_unsure_reduce";
  return "";
}

function canonicalMainProblemKey_(raw) {
  var s = safeString(raw).trim();
  if (!s) return "";
  if (s.indexOf("作业做不完") >= 0 || s.indexOf("作业总是做不完") >= 0 || s.indexOf("宿題が終わらない") >= 0 || s.indexOf("宿題がいつも終わらない") >= 0) return "homework_not_done";
  if (s.indexOf("做完但没时间复习") >= 0 || s.indexOf("終わっても復習する時間がない") >= 0 || s.indexOf("复习时间不够") >= 0 || (s.indexOf("終わっても") >= 0 && s.indexOf("復習") >= 0)) return "done_no_review";
  if (s.indexOf("错题反复错") >= 0 || s.indexOf("错题越来越多") >= 0 || s.indexOf("間違いを繰り返してしまう") >= 0 || s.indexOf("間違いが増えている") >= 0 || s.indexOf("間違えた問題を繰り返してしまう") >= 0 || (s.indexOf("同じ") >= 0 && s.indexOf("間違") >= 0)) return "repeat_mistakes";
  if (s.indexOf("测试准备总是来不及") >= 0 || s.indexOf("テスト準備がいつも間に合わない") >= 0 || s.indexOf("テスト準備") >= 0 || s.indexOf("测试准备") >= 0) return "test_review";
  if (s.indexOf("亲子冲突变多") >= 0 || s.indexOf("亲子冲突") >= 0 || s.indexOf("親子の衝突が増えている") >= 0 || s.indexOf("親子の衝突") >= 0 || s.indexOf("衝突") >= 0) return "conflict";
  if (s.indexOf("最近成绩/偏差值下降") >= 0 || s.indexOf("最近、成績や偏差値が下がっている") >= 0 || s.indexOf("成績・偏差値が下がっている") >= 0 || s.indexOf("成績") >= 0 || s.indexOf("偏差値") >= 0) return "score_drop";
  if (s.indexOf("家长不敢放手") >= 0 || s.indexOf("家长不催就不动") >= 0 || s.indexOf("親が手を離すのが不安") >= 0 || s.indexOf("親が声をかけないと動かない") >= 0) return "no_move_without_parent";
  return "";
}

function getPreferredSacrificedAreaText_(followup) {
  return safeString(followup && (followup.sacrificed_area || followup.hardest_tradeoff)).trim();
}

function getPreferredSacrificedAreaKey_(followup) {
  return canonicalTradeoffKey_(getPreferredSacrificedAreaText_(followup));
}

function buildWeeklyFocus_(dimensions, followup) {
  return determineWeeklyFocus_(dimensions, followup);
}

function determineWeeklyFocus_(dimensions, followup) {
  var currentKey = canonicalMainProblemKey_(safeString(followup && followup.current_main_problem).trim());
  var sacrificedKey = getPreferredSacrificedAreaKey_(followup);

  // Priority 1: current_main_problem
  if (currentKey === "homework_not_done" || currentKey === "done_no_review") return "作业取舍";
  if (currentKey === "repeat_mistakes") return "错题整理";
  if (currentKey === "no_move_without_parent") return "家长放手";
  if (currentKey === "test_review" || currentKey === "score_drop") return "优先级整理";
  if (currentKey === "conflict") return "学习节奏调整";

  // Priority 2: sacrificed_area
  if (sacrificedKey === "mistake_review") return "错题整理";
  if (sacrificedKey === "review" || sacrificedKey === "sleep_rest" || sacrificedKey === "homework_too_much") return "作业取舍";
  if (sacrificedKey === "test_review") return "优先级整理";
  if (sacrificedKey === "relationship_margin" || sacrificedKey === "parent_unsure_reduce") return "学习节奏调整";
  if (sacrificedKey === "memorization") return "优先级整理";

  // Priority 3: diagnosis dimension fallback
  var topDims = topDimensionsFromScores_(dimensions || {});
  var hw = Number((dimensions || {}).homework_load || 0);
  var rr = Number((dimensions || {}).review_retention || 0);
  var pl = Number((dimensions || {}).planning || 0);
  var ml = Number((dimensions || {}).mental_load || 0);
  var pi = Number((dimensions || {}).parent_involvement || 0);
  var au = Number((dimensions || {}).autonomy || 0);
  if (hw >= 3.5 && rr >= 3.5) return "作业取舍";
  if (rr >= 3.5) return "错题整理";
  if (pi >= 3.5 && au >= 3.5) return "家长放手";
  if (pl >= 3.5) return "优先级整理";
  if (ml >= 3.5) return "学习节奏调整";

  if (topDims.length > 0) {
    if (topDims[0] === "homework_load") return "作业取舍";
    if (topDims[0] === "review_retention") return "错题整理";
    if (topDims[0] === "planning") return "优先级整理";
    if (topDims[0] === "parent_involvement") return "家长放手";
    if (topDims[0] === "mental_load") return "学习节奏调整";
  }

  return "作业取舍";
}

function buildPackageNarrative_(weeklyFocus, diagnosis, followup, rules) {
  var focus = safeString(weeklyFocus).trim();
  var packageType = normalizePackageType_(safeString(diagnosis && diagnosis.diagnosisType).trim());
  var dims = (diagnosis && diagnosis.dimensions) || {};
  var subjectCn = normalizeSubjectCn_(safeString(followup && (followup.hardest_subject || followup.weak_subject)).trim());
  var late = isLateStudyEndTime_(safeString(followup && followup.study_end_time).trim());
  var currentMainProblem = safeString(followup && (followup.current_main_problem || followup.main_problem)).trim();
  var sacrificedText = getPreferredSacrificedAreaText_(followup);
  var sacrificeKey = getPreferredSacrificedAreaKey_(followup);
  var currentMainKey = canonicalMainProblemKey_(currentMainProblem);
  var overloadSignal =
    sacrificeKey === "homework_too_much" ||
    currentMainKey === "homework_not_done" ||
    currentMainKey === "done_no_review";
  var topDimKeys = topDimensionsFromScores_(dims);
  var hasReviewOrPlanning = topDimKeys.indexOf("review_retention") >= 0 || topDimKeys.indexOf("planning") >= 0;
  var isWorkloadModule = focus === "作业取舍 × 复习整理" || (overloadSignal && hasReviewOrPlanning);

  var narrative = {
    surface_problem: "",
    real_problem: "",
    keep_1: "",
    keep_2: "",
    keep_3: "",
    reduce_1: "",
    reduce_2: "",
    reduce_3: "",
    parent_do_1: "",
    parent_do_2: "",
    parent_stop_1: "",
    parent_stop_2: "",
    child_focus: "",
    observation_1: "",
    observation_2: "",
    observation_3: "",
    judgement_reason_1: "",
    judgement_reason_2: "",
    judgement_reason_3: "",
    tonight_action: "",
    tomorrow_action: "",
    this_week_action: "",
    weekend_action: "",
    pause_1: "",
    pause_2: "",
    pause_3: "",
    day1_focus: "",
    day1_parent_check: "",
    day2_focus: "",
    day2_parent_check: "",
    day3_focus: "",
    day3_parent_check: "",
    day4_focus: "",
    day4_parent_check: "",
    day5_focus: "",
    day5_parent_check: "",
    day6_focus: "",
    day6_parent_check: "",
    day7_focus: "",
    day7_parent_check: "",
  };

  if (isWorkloadModule) {
    narrative.surface_problem = currentMainProblem || "作业做不完";
    if (sacrificeKey === "review") {
      narrative.real_problem = "不是单纯作业太多，而是作业占掉了本该用于复习和整理的时间。";
    } else if (sacrificeKey === "sleep_rest") {
      narrative.real_problem = "不是单纯作业太多，而是任务量已经开始压缩睡眠和恢复时间。";
    } else {
      narrative.real_problem = "作业、复习、订正和先后顺序已经开始互相挤压。";
    }
    narrative.keep_1 = "塾指定必须提交、老师会检查的作业";
    narrative.keep_2 = subjectCn ? subjectCn + "中最卡的2〜3个问题" : "最卡科目中最卡的2〜3个问题";
    narrative.keep_3 = "每天10分钟，把当天没弄懂的地方重新看一遍";
    narrative.reduce_1 = "已经连续做对、明显熟练的重复题";
    narrative.reduce_2 = late ? "晚上临时追加的新任务" : "空出来的时间又被临时加上的任务填满";
    narrative.reduce_3 = "本周新增的市販问题集或额外打印题";
    narrative.parent_do_1 = "先把本周塾作业分成三类：必须提交、需要完成、可以暂缓。";
    narrative.parent_do_2 = "每天只确认一件事：今天最重要的是哪一项。";
    narrative.parent_stop_1 = "不要临时再加任务。";
    narrative.parent_stop_2 = late ? "不要为了补完所有内容而继续压缩睡眠。" : "不要一口气把所有内容都做完。";
    narrative.child_focus = subjectCn ? (subjectCn + "中最卡的2〜3个问题，重新弄明白") : "最卡的2〜3个问题，重新弄明白";
    narrative.observation_1 = "临时增加的任务有没有变少？";
    narrative.observation_2 = sacrificeKey === "sleep_rest"
      ? "今天是否比平时早一点结束？"
      : "今天有没有留出10分钟，把错题或没懂的地方重新看一遍？";
    narrative.observation_3 = late ? "晚上结束时间是否比之前稳定？" : "晚上结束时间是否比之前稳定？";
    narrative.judgement_reason_1 = "平日学习结束时间已经到 " + (safeString(followup && followup.study_end_time).trim() || "比较晚") + "，说明每天可用的恢复时间很少。";
    narrative.judgement_reason_2 = currentMainProblem
      ? ("当前最困扰的是「" + currentMainProblem + "」，说明家庭已经不是单纯任务太多，而是任务之间开始互相挤压。")
      : "当前的困难已经不是单纯任务太多，而是任务之间开始互相挤压。";
    narrative.judgement_reason_3 = sacrificedText
      ? ("最近最容易被挤掉的是「" + sacrificedText + "」，因此这份整理包会优先保证相关时间不再继续被压缩。")
      : "最近最容易被挤掉的内容，正是这周必须先保住的部分。";
    narrative.tonight_action = "今晚先把本周塾作业分成三类：必须提交、需要完成、可以暂缓。";
    narrative.tomorrow_action = subjectCn
      ? ("明天只选" + subjectCn + "中真正卡住的2〜3个问题，重新看一遍，不追求多。")
      : "明天只选最卡的科目中真正卡住的2〜3个问题，重新看一遍，不追求多。";
    narrative.this_week_action = "这一周每天只留10分钟，把当天最容易错、最容易忘的地方重新看一遍。";
    narrative.weekend_action = "周末只整理两件事：下周继续保留什么、继续减少什么。";
    narrative.pause_1 = "新的市販问题集";
    narrative.pause_2 = "额外打印题";
    narrative.pause_3 = late ? "晚上临时想到的追加任务" : "当天晚上临时想到的追加任务";

    narrative.day1_focus = "把本周塾作业分成三类：必须提交、需要完成、可以暂缓。";
    narrative.day1_parent_check = "今天有没有真的划掉1〜2项可以暂缓的内容？";
    narrative.day2_focus = subjectCn
      ? ("最卡科目只选2〜3个真正卡住的问题，重新看一遍。")
      : "最卡科目只选2〜3个真正卡住的问题，重新看一遍。";
    narrative.day2_parent_check = subjectCn
      ? ("今天有没有把" + subjectCn + "里最卡的2〜3个问题重新弄明白？")
      : "今天有没有把2〜3个最卡的问题重新弄明白？";
    narrative.day3_focus = "安排一次短复习，只看昨天和前天最容易忘的地方。";
    narrative.day3_parent_check = "今天有没有避免再追加新任务？";
    narrative.day4_focus = "确认前3天有没有又回到“全部都要做完”的状态。";
    narrative.day4_parent_check = "今天有没有继续保留“必须做”和“可以暂缓”的区分？";
    narrative.day5_focus = "检查本周减少的内容是否真的减少了。";
    narrative.day5_parent_check = "今天有没有把省下来的时间用于复习、订正或早点休息？";
    narrative.day6_focus = late
      ? "只补一个最重要的缺口，不再临时扩大战线。"
      : "只补一个最重要的缺口，不再临时扩大战线。";
    narrative.day6_parent_check = "今天有没有控制住再加一点的冲动？";
    narrative.day7_focus = "整理下周继续保留的2件事、继续减少的2件事。";
    narrative.day7_parent_check = "下周最先守住的一件事是什么？";
  } else {
    narrative.surface_problem = currentMainProblem || "家庭学习正在变得有点乱";
    narrative.real_problem = safeString(rules && rules.primary_problem).trim() || "需要先整理每天的安排";
    narrative.keep_1 = safeString(rules && rules.keep_1).trim();
    narrative.keep_2 = safeString(rules && rules.keep_2).trim();
    narrative.keep_3 = safeString(rules && rules.keep_3).trim();
    narrative.reduce_1 = safeString(rules && rules.reduce_1).trim();
    narrative.reduce_2 = safeString(rules && rules.reduce_2).trim();
    narrative.reduce_3 = safeString(rules && rules.reduce_3).trim();
    narrative.parent_do_1 = safeString(rules && rules.parent_check_1).trim();
    narrative.parent_do_2 = safeString(rules && rules.parent_check_2).trim();
    narrative.parent_stop_1 = safeString(rules && rules.parent_check_reason_1).trim();
    narrative.parent_stop_2 = safeString(rules && rules.parent_check_reason_2).trim();
    narrative.child_focus = narrative.keep_2 || narrative.keep_1;
    narrative.observation_1 = "今天有没有少一点临时加任务？";
    narrative.observation_2 = "今天有没有多一点复习和整理？";
    narrative.observation_3 = "亲子之间是不是少冲突一点？";
    narrative.judgement_reason_1 = "";
    narrative.judgement_reason_2 = "";
    narrative.judgement_reason_3 = "";
    narrative.tonight_action = "";
    narrative.tomorrow_action = "";
    narrative.this_week_action = "";
    narrative.weekend_action = "";
    narrative.pause_1 = "";
    narrative.pause_2 = "";
    narrative.pause_3 = "";
    narrative.day1_focus = "先把本周最重要的一件事定下来。";
    narrative.day1_parent_check = "今天有没有先做最重要的那一件？";
    narrative.day2_focus = "只抓最卡的2〜3个问题，不要一下子铺太多。";
    narrative.day2_parent_check = "孩子能不能说出这2〜3个问题卡在哪里？";
    narrative.day3_focus = "安排一次短复习，补一补最容易忘的地方。";
    narrative.day3_parent_check = "今天有没有留一点时间做复习和整理？";
    narrative.day4_focus = "确认有没有又开始什么都想做完。";
    narrative.day4_parent_check = "今天有没有继续保留必须做和可以暂缓的区分？";
    narrative.day5_focus = "检查减少的内容有没有真的减少。";
    narrative.day5_parent_check = "今天有没有把省下来的时间用于复习、订正或早点休息？";
    narrative.day6_focus = "只补一个最重要的缺口。";
    narrative.day6_parent_check = "今天有没有控制住再加一点的冲动？";
    narrative.day7_focus = "整理下周继续保留和继续减少的内容。";
    narrative.day7_parent_check = "下周最先守住的一件事是什么？";
  }

  return narrative;
}

function buildPackageSummary_(weeklyFocus, diagnosis, followup, rules) {
  var focus = safeString(weeklyFocus).trim() || "作业取舍";
  var currentMainProblem = safeString(followup && (followup.current_main_problem || followup.main_problem)).trim();
  var sacrificedText = getPreferredSacrificedAreaText_(followup);
  var sacrificeKey = getPreferredSacrificedAreaKey_(followup);
  var subjectCn = normalizeSubjectCn_(safeString(followup && (followup.hardest_subject || followup.weak_subject)).trim());
  var subjectFallback = subjectCn || "最卡的科目";
  var late = isLateStudyEndTime_(safeString(followup && followup.study_end_time).trim());

  var summary = {
    focus_theme: focus,
    one_line_conclusion: "",
    surface_problem: currentMainProblem || "现在最需要先整理的是家庭学习里哪些该保、哪些该减。",
    real_problem: "",
    keep_1: "",
    keep_2: "",
    keep_3: "",
    reduce_1: "",
    reduce_2: "",
    reduce_3: "",
    pause_1: "",
    pause_2: "",
    pause_3: "",
    parent_goal: "",
    child_goal: "",
    keep_reason: "",
    reduce_reason: "",
    parent_do_1: "",
    parent_do_2: "",
    parent_stop_1: "",
    parent_stop_2: "",
    child_focus: "",
    observation_1: "",
    observation_2: "",
    observation_3: "",
    tonight_action: "",
    tomorrow_action: "",
    this_week_action: "",
    weekend_action: "",
    judgement_reason_1: "",
    judgement_reason_2: "",
    judgement_reason_3: "",
  };

  if (focus === "作业取舍") {
    summary.one_line_conclusion = "本周不是继续增加学习量，而是先把作业、复习和订正重新排好顺序。";
    summary.surface_problem = currentMainProblem || "作业做不完";
    summary.real_problem = "不是单纯作业太多，而是作业占掉了本该用于复习、订正和休息的时间。";
    summary.keep_1 = "塾指定必须提交、老师会检查的作业";
    summary.keep_2 = subjectFallback + "中最卡的2〜3个问题";
    summary.keep_3 = "每天10分钟，把当天没弄懂的地方重新看一遍";
    summary.reduce_1 = "已经会做、连续做对的重复题";
    summary.reduce_2 = "晚上临时追加的新任务";
    summary.reduce_3 = "本周新增的市販问题集或额外打印题";
    summary.pause_1 = "新的市販问题集";
    summary.pause_2 = "额外打印题";
    summary.pause_3 = "当天晚上临时想到的追加任务";
    summary.parent_goal = "家长本周的目标不是盯所有作业，而是帮助孩子分清“必须做”和“可以暂缓”。";
    summary.child_goal = "孩子本周的目标不是做更多题，而是把最卡的2〜3个问题真正弄明白。";
    summary.parent_do_1 = "每天先确认今天最重要的一件事";
    summary.parent_do_2 = "帮孩子把任务分成“必须做”和“可以暂缓”";
    summary.parent_stop_1 = "不要临时增加新任务";
    summary.parent_stop_2 = "不要只追问“全部做完了吗”";
    summary.child_focus = subjectFallback + "中最卡的2〜3个问题";
    summary.observation_1 = "临时增加的任务有没有变少";
    summary.observation_2 = "每天是否留出了10分钟复习和整理";
    summary.observation_3 = "晚上结束时间是否比之前稳定";
    summary.keep_reason = "这三项先保住，是为了不影响塾内节奏，同时避免错题和没懂的内容继续往后拖。";
    summary.reduce_reason = "这些内容短期收益不高，却最容易挤掉复习、订正和休息时间。";
    summary.tonight_action = "今晚先把本周塾作业分成三类：必须提交、需要完成、可以暂缓。";
    summary.tomorrow_action = "明天只选" + subjectFallback + "中真正卡住的2〜3个问题，重新看一遍，不追求多。";
    summary.this_week_action = "这一周每天只留10分钟，把当天最容易错、最容易忘的地方重新看一遍。";
    summary.weekend_action = "周末只整理两件事：下周继续保留什么、继续减少什么。";
    summary.judgement_reason_1 = "平日学习结束时间已经到 " + (safeString(followup && followup.study_end_time).trim() || "比较晚") + "，说明每天可用的恢复时间很少。";
    summary.judgement_reason_2 = currentMainProblem
      ? ("当前最困扰的是「" + currentMainProblem + "」，说明家庭已经不是单纯任务太多，而是任务之间开始互相挤压。")
      : "当前的困难已经不只是任务量，而是任务之间开始互相挤压。";
    summary.judgement_reason_3 = sacrificedText
      ? ("最近最容易被挤掉的是「" + sacrificedText + "」，因此这份整理包会优先保证相关时间不再继续被压缩。")
      : "最近最容易被挤掉的内容，正是这周必须先保住的部分。";
    return summary;
  }

  if (focus === "错题整理") {
    summary.one_line_conclusion = "本周重点不是继续做更多题，而是先把反复错的地方真正弄明白。";
    summary.surface_problem = currentMainProblem || "错题越来越多";
    summary.real_problem = "不是题做得太少，而是做错过的题没有被真正消化，类似错误正在反复出现。";
    summary.keep_1 = subjectFallback + "中反复错的2〜3个问题";
    summary.keep_2 = "孩子能用自己的话讲清楚的基础题";
    summary.keep_3 = "每天只整理当天最重要的一道错题";
    summary.reduce_1 = "只为了完成页数的机械订正";
    summary.reduce_2 = "一次性处理太多错题";
    summary.reduce_3 = "没有弄懂就继续往前刷的新题";
    summary.pause_1 = "整本错题本全部重做";
    summary.pause_2 = "大量同类题连续刷";
    summary.pause_3 = "只抄答案的订正";
    summary.parent_goal = "家长本周的目标不是检查订正数量，而是确认孩子是否真的知道错在哪里。";
    summary.child_goal = "孩子本周的目标不是把错题全部做完，而是先把最容易反复错的2〜3个地方弄明白。";
    summary.parent_do_1 = "每天只问一个问题：这题当时为什么错？";
    summary.parent_do_2 = "让孩子用自己的话说明一次解法";
    summary.parent_stop_1 = "不要要求一次性订正所有错题";
    summary.parent_stop_2 = "不要只看答案是否写满";
    summary.child_focus = subjectFallback + "中反复错的2〜3个问题";
    summary.observation_1 = "孩子是否能说出自己为什么错";
    summary.observation_2 = "同类错误是否减少";
    summary.observation_3 = "订正是否从“写完”变成“弄懂”";
    summary.keep_reason = "先保住少量高频错题，是为了把最容易反复失分的地方稳住。";
    summary.reduce_reason = "错题一次性处理太多，通常只会变成形式上的订正，真正理解反而跟不上。";
    summary.tonight_action = "今晚先从最近错题里选出最常错的2〜3题，不要全部摊开。";
    summary.tomorrow_action = "明天让孩子不看答案，重新做其中1题。";
    summary.this_week_action = "这一周每天只处理一道最重要的错题，确认是否真的弄懂。";
    summary.weekend_action = "周末整理下周还需要继续盯住的2个错误类型。";
    summary.judgement_reason_1 = "最近最常错的内容，已经反复出现了几次。";
    summary.judgement_reason_2 = "如果继续只看做完了多少，错题会继续被拖到后面。";
    summary.judgement_reason_3 = "这周先把少量高频错误弄明白，才比较能稳住下一周。";
  } else if (focus === "家长放手") {
    summary.one_line_conclusion = "本周重点不是家长继续加力，而是减少临时介入，让孩子先承担一小部分判断。";
    summary.surface_problem = currentMainProblem || "家长不敢放手";
    summary.real_problem = "不是家长不够认真，而是家庭学习已经过度依赖家长提醒，孩子自己判断和启动的机会太少。";
    summary.keep_1 = "塾明确要求提交的内容";
    summary.keep_2 = "孩子自己说最不会的1〜2个地方";
    summary.keep_3 = "每天一个固定开始动作";
    summary.reduce_1 = "家长临时追加的任务";
    summary.reduce_2 = "反复催促“快点做”";
    summary.reduce_3 = "家长替孩子重新安排全部计划";
    summary.pause_1 = "家长临时改计划";
    summary.pause_2 = "当天追加新要求";
    summary.pause_3 = "把所有任务重新排一遍";
    summary.parent_goal = "家长本周的目标不是管得更细，而是把一部分判断交还给孩子。";
    summary.child_goal = "孩子本周的目标不是完全自觉，而是每天能自己说出第一件要做的事。";
    summary.parent_do_1 = "每天只确认“第一件事是什么”";
    summary.parent_do_2 = "让孩子自己说出最卡的地方";
    summary.parent_stop_1 = "不要从头管到尾";
    summary.parent_stop_2 = "不要孩子一慢就马上接管";
    summary.child_focus = "每天自己说出第一件要做的事，并完成它";
    summary.observation_1 = "孩子是否能说出第一件要做的事";
    summary.observation_2 = "家长催促次数是否减少";
    summary.observation_3 = "孩子是否有一次自己开始学习";
    summary.keep_reason = "先保住明确任务和一个启动动作，是为了降低混乱，同时给孩子一点自主空间。";
    summary.reduce_reason = "家长介入越多，孩子越容易只等指令，家庭冲突也会增加。";
    summary.tonight_action = "今晚让孩子自己说出明天第一件要做的事。";
    summary.tomorrow_action = "明天只确认第一件事有没有开始，不立刻追加其他要求。";
    summary.this_week_action = "这一周每天少管一个环节，让孩子自己做一次选择。";
    summary.weekend_action = "周末和孩子一起确认：下周哪一件事可以由孩子自己决定。";
    summary.judgement_reason_1 = "最近的推进方式已经越来越依赖家长提醒。";
    summary.judgement_reason_2 = "如果继续家长全程接管，孩子会更难自己动起来。";
    summary.judgement_reason_3 = "先给孩子一点判断空间，家庭冲突通常会少一点。";
  } else if (focus === "优先级整理") {
    summary.one_line_conclusion = "本周重点不是把所有内容都补上，而是先决定测试前最该守住什么。";
    summary.surface_problem = currentMainProblem || "测试准备总是来不及";
    summary.real_problem = "不是没有安排学习，而是每天的先后顺序不清楚，重要复习容易被日常任务挤掉。";
    summary.keep_1 = "测试范围里最容易失分的基础内容";
    summary.keep_2 = subjectFallback + "中短期最容易提分的部分";
    summary.keep_3 = "每天第一个固定复习入口";
    summary.reduce_1 = "临时追加的非重点任务";
    summary.reduce_2 = "短期内很难补起来的高难题";
    summary.reduce_3 = "和这次测试关系不大的练习";
    summary.pause_1 = "非测试范围的新内容";
    summary.pause_2 = "高难度拓展题";
    summary.pause_3 = "临时想到的补充练习";
    summary.parent_goal = "家长本周的目标不是让孩子都做，而是帮孩子先确定“测试前最该守住什么”。";
    summary.child_goal = "孩子本周的目标不是全范围补完，而是先守住最容易失分的基础内容。";
    summary.parent_do_1 = "每天先确认今天最重要的测试范围";
    summary.parent_do_2 = "把任务分成“测试前必须”和“可以之后再看”";
    summary.parent_stop_1 = "不要测试前临时扩大范围";
    summary.parent_stop_2 = "不要把难题放在每天最前面";
    summary.child_focus = subjectFallback + "中测试前最容易失分的基础内容";
    summary.observation_1 = "每天是否先做了最重要的测试范围";
    summary.observation_2 = "临时追加内容是否减少";
    summary.observation_3 = "测试前焦虑是否比之前少一点";
    summary.keep_reason = "先保住基础和测试范围，是为了避免测试前所有内容一起拥挤。";
    summary.reduce_reason = "测试前临时加太多内容，会继续挤掉真正该复习的重点。";
    summary.tonight_action = "今晚先把测试范围分成“必须守住”和“暂时不追”的两类。";
    summary.tomorrow_action = "明天先复习最容易拿分但容易忘的内容。";
    summary.this_week_action = "这一周每天从固定复习入口开始，不再每天重新决定先做什么。";
    summary.weekend_action = "周末只确认下次测试前需要提前准备的2件事。";
    summary.judgement_reason_1 = "当前最需要先处理的，是测试前的先后顺序。";
    summary.judgement_reason_2 = "如果继续临时加任务，重要复习会继续被挤掉。";
    summary.judgement_reason_3 = "先守住基础和最容易失分的内容，压力会小很多。";
  } else if (focus === "学习节奏调整") {
    summary.one_line_conclusion = "本周重点不是继续硬撑，而是先把晚上结束时间和家庭气氛稳定下来。";
    summary.surface_problem = currentMainProblem || "亲子冲突变多";
    summary.real_problem = "不是孩子不努力，而是学习时间、任务量和家庭情绪已经开始互相影响。";
    summary.keep_1 = "当天最重要的一件学习任务";
    summary.keep_2 = "每天一个短复习时间";
    summary.keep_3 = "固定的学习结束时间";
    summary.reduce_1 = "晚上继续追加的新任务";
    summary.reduce_2 = "疲劳后继续做的新内容";
    summary.reduce_3 = "为了安心而临时增加的练习";
    summary.pause_1 = "睡前追加任务";
    summary.pause_2 = "疲劳后的新题";
    summary.pause_3 = "亲子情绪已经紧张时的继续推进";
    summary.parent_goal = "家长本周的目标不是继续压任务，而是先让家庭学习回到比较稳定的节奏。";
    summary.child_goal = "孩子本周的目标不是完成所有内容，而是每天稳定完成最重要的一件事。";
    summary.parent_do_1 = "每天先定学习结束时间";
    summary.parent_do_2 = "只确认当天最重要的一件事";
    summary.parent_stop_1 = "不要在疲劳后继续追加任务";
    summary.parent_stop_2 = "不要把当天没做完的焦虑全部带到晚上";
    summary.child_focus = "每天稳定完成最重要的一件事";
    summary.observation_1 = "晚上结束时间是否稳定";
    summary.observation_2 = "亲子冲突是否减少";
    summary.observation_3 = "孩子是否少一点抗拒学习";
    summary.keep_reason = "先保住一件重要任务和结束时间，是为了让家庭学习重新稳定下来。";
    summary.reduce_reason = "疲劳后继续加任务，短期看似多做了，实际容易让第二天状态更差。";
    summary.tonight_action = "今晚先定一个结束时间，到点后不再追加新任务。";
    summary.tomorrow_action = "明天只守住当天最重要的一件事。";
    summary.this_week_action = "这一周观察晚上结束时间是否比之前稳定。";
    summary.weekend_action = "周末整理下周最容易让家庭崩掉的一个时间段，并提前减少任务。";
    summary.judgement_reason_1 = "最近的状态已经开始受晚上结束时间影响。";
    summary.judgement_reason_2 = "如果继续疲劳后追加任务，亲子冲突通常会更明显。";
    summary.judgement_reason_3 = "先把节奏稳住，比继续硬撑更重要。";
  } else {
    summary.one_line_conclusion = "本周先把家庭学习里最该保住和最该减少的内容分清。";
    summary.real_problem = "现在更需要先整理每天的安排，而不是继续把任务堆满。";
    summary.keep_1 = "最明确、必须完成的内容";
    summary.keep_2 = subjectFallback + "里最卡的2〜3个问题";
    summary.keep_3 = "每天留一点时间复习和整理";
    summary.keep_reason = "先保住最关键的几项，家庭才不容易继续被任务带着跑。";
    summary.reduce_1 = "重复做很多次也没有新收获的内容";
    summary.reduce_2 = "临时想到就加上的任务";
    summary.reduce_3 = "占掉休息时间的额外练习";
    summary.reduce_reason = "这些内容最容易把真正该做的事情挤掉。";
    summary.parent_goal = "家长本周先把任务分清楚，不要继续把所有东西都塞进来。";
    summary.child_goal = "孩子本周先把最卡的两三件事弄明白。";
    summary.parent_do_1 = "先确认今天最重要的一件事";
    summary.parent_do_2 = "帮孩子分清必须做和可以暂缓";
    summary.parent_stop_1 = "不要临时增加任务";
    summary.parent_stop_2 = "不要把所有空余都填满";
    summary.child_focus = subjectFallback + "中最卡的2〜3个问题";
    summary.observation_1 = "临时增加的任务有没有变少";
    summary.observation_2 = "每天是否留出了一点复习时间";
    summary.observation_3 = late ? "晚上结束时间是否比之前稳定" : "孩子是否更容易开始";
    summary.tonight_action = "今晚先把本周要做的内容分清楚。";
    summary.tomorrow_action = "明天只看最卡的2〜3个问题，不追求多。";
    summary.this_week_action = "这一周每天留一点时间，先把最容易忘的地方看一遍。";
    summary.weekend_action = "周末整理一下下周继续保留和继续减少的内容。";
    summary.judgement_reason_1 = "这份整理包主要是为了帮家长先把本周顺序理清。";
    summary.judgement_reason_2 = currentMainProblem ? ("当前最困扰的是「" + currentMainProblem + "」。") : "当前的困扰已经很明显，需要先整理。";
    summary.judgement_reason_3 = sacrificedText ? ("最近最容易被挤掉的是「" + sacrificedText + "」。") : "最近最容易被挤掉的内容，需要先保住。";
  }

  var genericKeep2 = subjectFallback + "里最卡的2〜3个问题";
  if (!summary.keep_1) summary.keep_1 = "最明确、必须完成的内容";
  if (!summary.keep_2) summary.keep_2 = genericKeep2;
  if (!summary.keep_3) summary.keep_3 = "每天留一点时间，把最容易忘的地方重新看一遍";
  if (!summary.reduce_1) summary.reduce_1 = "重复很多次也没有新收获的内容";
  if (!summary.reduce_2) summary.reduce_2 = late ? "晚上临时追加的新任务" : "为了填满时间而临时追加的任务";
  if (!summary.reduce_3) summary.reduce_3 = "占掉休息时间的额外练习";
  if (!summary.pause_1) summary.pause_1 = "新的市販问题集";
  if (!summary.pause_2) summary.pause_2 = "额外打印题";
  if (!summary.pause_3) summary.pause_3 = late ? "晚上临时想到的追加任务" : "当天临时想到的追加任务";
  if (!summary.parent_goal) summary.parent_goal = "家长这一周先只盯最重要的一件事。";
  if (!summary.child_goal) summary.child_goal = "孩子这一周先把最卡的2〜3个问题弄明白。";
  if (!summary.keep_reason) summary.keep_reason = "先保住最关键的几项，家庭才不容易继续被任务带着跑。";
  if (!summary.reduce_reason) summary.reduce_reason = "这些内容最容易把真正该做的事情挤掉。";
  if (!summary.parent_do_1) summary.parent_do_1 = "每天先确认今天最重要的一件事";
  if (!summary.parent_do_2) summary.parent_do_2 = "帮孩子把任务分成“必须做”和“可以暂缓”";
  if (!summary.parent_stop_1) summary.parent_stop_1 = "不要临时增加任务";
  if (!summary.parent_stop_2) summary.parent_stop_2 = "不要把所有空余都填满";
  if (!summary.child_focus) summary.child_focus = genericKeep2;
  if (!summary.observation_1) summary.observation_1 = "临时增加的任务有没有变少";
  if (!summary.observation_2) summary.observation_2 = "每天是否留出了一点复习时间";
  if (!summary.observation_3) summary.observation_3 = late ? "晚上结束时间是否比之前稳定" : "孩子是否更容易开始";
  if (!summary.tonight_action) summary.tonight_action = "今晚先把本周要做的内容分清楚。";
  if (!summary.tomorrow_action) summary.tomorrow_action = "明天只看最卡的2〜3个问题，不追求多。";
  if (!summary.this_week_action) summary.this_week_action = "这一周每天留一点时间，先把最容易忘的地方看一遍。";
  if (!summary.weekend_action) summary.weekend_action = "周末整理一下下周继续保留和继续减少的内容。";
  if (!summary.judgement_reason_1) summary.judgement_reason_1 = "平日学习结束时间已经到 " + (safeString(followup && followup.study_end_time).trim() || "比较晚") + "，说明每天可用的恢复时间很少。";
  if (!summary.judgement_reason_2) summary.judgement_reason_2 = currentMainProblem ? ("当前最困扰的是「" + currentMainProblem + "」。") : "当前的困扰已经很明显，需要先整理。";
  if (!summary.judgement_reason_3) summary.judgement_reason_3 = sacrificedText ? ("最近最容易被挤掉的是「" + sacrificedText + "」。") : "最近最容易被挤掉的内容，需要先保住。";

  return summary;
}

function derivePackageRules_(diagnosis, followup) {
  // diagnosis: { diagnosisType, dimensions, topDims? }
  // followup: { hardest_tradeoff, current_main_problem, study_end_time, hardest_subject, ... }
  var diagnosisType = safeString(diagnosis && diagnosis.diagnosisType).trim();
  var packageType = normalizePackageType_(diagnosisType);

  var hardestTradeoff = safeString(followup && followup.hardest_tradeoff).trim();
  var currentMainProblem = safeString(followup && followup.current_main_problem).trim();
  var studyEndTime = safeString(followup && followup.study_end_time).trim();
  var hardestSubjectRaw = safeString(followup && followup.hardest_subject).trim();

  // Legacy fallbacks
  if (!currentMainProblem) currentMainProblem = safeString(followup && followup.main_problem).trim();
  if (!studyEndTime) studyEndTime = safeString(followup && followup.weekday_end_time).trim();
  if (!hardestSubjectRaw) hardestSubjectRaw = safeString(followup && followup.weak_subject).trim();

  var subjectCn = normalizeSubjectCn_(hardestSubjectRaw);

  var tradeoffKey = canonicalTradeoffKey_(hardestTradeoff);
  var mainProblemKey = canonicalMainProblemKey_(currentMainProblem);
  var late = isLateStudyEndTime_(studyEndTime);
  var early = isEarlyStudyEndTime_(studyEndTime);

  // Primary selection by strict priority:
  // 1 hardest_tradeoff, 2 current_main_problem, 3 study_end_time, 4 subject, 5 diagnosis_type, 6 top dims, 7 dimension scores
  var primaryKey = "";
  if (tradeoffKey) primaryKey = tradeoffKey;
  else if (mainProblemKey) primaryKey = mainProblemKey;
  else if (late || early) primaryKey = late ? "late_study" : "early_study";
  else if (subjectCn) primaryKey = "subject_block";
  else if (packageType === "負荷過多型") primaryKey = "homework_too_much";
  else if (packageType === "表面努力型") primaryKey = "too_many_mistakes";
  else if (packageType === "計画混乱型") primaryKey = "test_review";
  else if (packageType === "親主導型") primaryKey = "no_move_without_parent";
  else if (packageType === "不安定型") primaryKey = "instability";
  else primaryKey = "generic";

  // Secondary key: next informative signal.
  var secondaryKey = "";
  if (primaryKey !== tradeoffKey && tradeoffKey) secondaryKey = tradeoffKey;
  else if (primaryKey !== mainProblemKey && mainProblemKey) secondaryKey = mainProblemKey;
  else if (!secondaryKey && (late || early)) secondaryKey = late ? "late_study" : "early_study";
  else if (!secondaryKey && subjectCn) secondaryKey = "subject_block";

  var out = {
    primary_problem: "",
    secondary_problem: "",
    keep_1: "",
    keep_reason_1: "",
    keep_2: "",
    keep_reason_2: "",
    reduce_1: "",
    reduce_reason_1: "",
    reduce_2: "",
    reduce_reason_2: "",
    parent_check_1: "",
    parent_check_reason_1: "",
    parent_check_2: "",
    parent_check_reason_2: "",
  };

  function subjectKeyProblems_(subject) {
    if (!subject) return "最卡科目里反复卡住的2〜3个关键问题";
    if (subject === "算数") return "算数中反复卡住的2〜3个关键问题";
    if (subject === "国语") return "国语里最容易拖后的阅读/汉字（先抓2〜3个点）";
    if (subject === "理科") return "理科测试范围内最常错的2〜3题（先弄明白）";
    if (subject === "社会") return "社会里最容易混淆的暗记点（先缩小范围）";
    return subject + "中反复卡住的2〜3个关键问题";
  }

  // ---- Core rule sets (CN output) ----
  // Pick exactly ONE main rule set by primaryKey to respect priority.
  // Rule 1: homework overload / too much homework
  if (primaryKey === "homework_too_much" || primaryKey === "homework_not_done" || primaryKey === "done_no_review" || primaryKey === "review" || primaryKey === "sleep_rest") {
    out.primary_problem = "当前最主要的问题不是不够努力，而是作业处理占据了家庭学习的大部分精力。";
    out.keep_1 = "塾指定必须提交、老师会检查的作业";
    out.keep_reason_1 = "这部分先保留，是为了不影响课堂跟进和塾内节奏。其他内容再考虑减少。";
    out.keep_2 = subjectKeyProblems_(subjectCn);
    out.keep_reason_2 = "最卡科目不适合继续只追完成量。本周先抓少量关键问题，更容易真正弄明白。";
    out.reduce_1 = "已经连续做对、明显熟练的重复题";
    out.reduce_reason_1 = "这类内容继续加量，收益不大，反而容易把真正需要复习、整理和消化错题的时间挤掉。";
    out.reduce_2 = late ? "晚上临时追加的新任务" : "空出来的时间又被临时加上的任务填满";
    out.reduce_reason_2 = late
      ? "过晚追加任务会压缩睡眠和第二天状态，容易让家庭学习进入疲劳循环。"
      : "空出来的时间被临时任务填满，会让真正需要复习、订正和消化错题的时间越来越少。";
  }

  // Rule 2: too many mistakes / surface effort
  else if (primaryKey === "too_many_mistakes" || primaryKey === "repeat_mistakes" || primaryKey === "mistake_review") {
    out.primary_problem = "当前最主要的问题不是没做题，而是做过的内容没有真正弄明白、下次还会错。";
    out.keep_1 = subjectCn ? subjectCn + "高频错题2〜3题（只抓关键）" : "高频错题2〜3题（只抓关键）";
    out.keep_reason_1 = "反复错的题最能暴露理解漏洞。本周先把少量高频错误弄明白，比继续刷量更重要。";
    out.keep_2 = "能够说清楚解法的基础题（讲清楚再做）";
    out.keep_reason_2 = "能讲清楚比做过更重要，可以防止“听懂了但自己不会”的反复出现。";
    out.reduce_1 = "只为了完成页数的机械订正（抄答案式）";
    out.reduce_reason_1 = "如果订正只是照着解法走，下一次还是会错，反而浪费精力。";
    out.reduce_2 = "一次性处理太多错题";
    out.reduce_reason_2 = "错题太多时想一次弄完很容易失败。本周先控制数量，确保真的弄明白。";
  }

  // Rule 3: test review late / planning chaos
  else if (primaryKey === "test_review" || primaryKey === "score_drop") {
    out.primary_problem = "当前最主要的问题是先后顺序不清，重要复习容易被日常作业挤到后面。";
    out.keep_1 = "测试范围中最容易失分的基础内容";
    out.keep_reason_1 = "测试前先保住基础得分点，比临时追难题更稳定。";
    out.keep_2 = "每天一个固定复习入口（固定从哪里开始）";
    out.keep_reason_2 = "固定入口能减少每天重新决定先做什么的消耗，让每天的运转更稳。";
    out.reduce_1 = "临时追加的非重点任务";
    out.reduce_reason_1 = "测试前临时加太多内容，会进一步打乱优先顺序。";
    out.reduce_2 = "难度高但短期很难弄明白的题目";
    out.reduce_reason_2 = "这类题短期收益不稳定，容易挤占基础复习时间。";
  }

  // Rule 4: memorization always delayed
  else if (primaryKey === "memorization") {
    out.primary_problem = "当前最主要的问题是暗记类内容被作业和错题不断往后推，最后容易在考前一起爆发。";
    out.keep_1 = "每天固定10分钟的暗记（少量即可）";
    out.keep_reason_1 = "暗记类最怕集中补，本周先恢复每天少量接触。";
    out.keep_2 = "最近测试范围内的高频知识点（先缩小范围）";
    out.keep_reason_2 = "优先处理高频内容，比平均铺开更现实。";
    out.reduce_1 = "睡前临时大量背诵";
    out.reduce_reason_1 = "疲劳状态下大量背诵效率低，第二天也容易忘。";
    out.reduce_2 = "没有范围意识的泛泛复习";
    out.reduce_reason_2 = "暗记类必须先缩小范围，否则容易做很多但不稳定。";
  }

  // Rule 5: parent unsure reduce / conflict
  else if (primaryKey === "parent_unsure_reduce" || primaryKey === "conflict" || primaryKey === "relationship_margin") {
    out.primary_problem = "当前最主要的问题是家庭内部缺少明确的取舍标准：一边想减量，一边又担心落后。";
    out.keep_1 = "塾明确要求提交或老师会检查的内容";
    out.keep_reason_1 = "这部分先保留，能降低家长对“减量会不会出问题”的不安。";
    out.keep_2 = "孩子自己说明“最不会”的1〜2个点（先从这里入手）";
    out.keep_reason_2 = "从孩子最卡的地方入手，比家长全面控制更容易降低冲突。";
    out.reduce_1 = "家长临时判断追加的任务";
    out.reduce_reason_1 = "临时追加最容易引发冲突，也最容易破坏当天节奏。";
    out.reduce_2 = late ? "已经明显疲劳后继续推进的新内容" : "疲劳状态下推进的新内容";
    out.reduce_reason_2 = late
      ? "疲劳后继续推进，新内容吸收差，容易变成亲子对抗。"
      : "疲劳状态下继续推进效率很低，反而更容易起冲突。";
  } else if (primaryKey === "no_move_without_parent") {
    out.primary_problem = "当前最主要的问题是学习更依赖家长推动：家长一停，学习就容易慢下来。";
    out.keep_1 = "塾明确要求提交或老师会检查的内容";
    out.keep_reason_1 = "先把最明确的“必须项”稳住，避免家长因为不安而全面接管。";
    out.keep_2 = "每天开始前，孩子先说清楚“第一件事是什么”";
    out.keep_reason_2 = "让孩子先说出口，比家长直接下指令更容易把主动权慢慢交回去。";
    out.reduce_1 = "家长临时加的任务（当场决定、当场追加）";
    out.reduce_reason_1 = "临时追加最容易引发对抗，也会让孩子更依赖家长指令。";
    out.reduce_2 = late ? "疲劳时继续推进的新内容" : "疲劳时硬推的新内容";
    out.reduce_reason_2 = "疲劳状态下效率低，也更容易引发亲子冲突。";
  }

  // Overlay: study end time rules (must be reflected)
  if (late) {
    if (!out.reduce_2) out.reduce_2 = "晚上22点以后追加的新任务";
    if (!out.reduce_reason_2) out.reduce_reason_2 = "过晚追加任务会压缩睡眠和第二天状态，容易进入疲劳循环。";
  } else if (early) {
    if (out.reduce_2 && out.reduce_2.indexOf("22点") >= 0) {
      out.reduce_2 = "空出来的时间又被临时加上的任务填满";
      out.reduce_reason_2 = "空出来的时间被临时任务填满，会让真正需要复习、订正和消化错题的时间越来越少。";
    }
  }

  // Parent checks: check tradeoff execution (not completion volume).
  out.parent_check_1 = "今天有没有先分清“必须完成”和“可以暂缓”";
  out.parent_check_reason_1 = "家长只盯完成量，容易重新回到全部硬做；先确认取舍，才能减轻一周压力。";
  out.parent_check_2 = late
    ? "今天有没有留出10分钟，把错题或没懂的地方重新看一遍（晚上不再加新任务）"
    : "今天有没有留出10分钟，把错题或没懂的地方重新看一遍";
  out.parent_check_reason_2 = "如果没有固定的复习和整理时间，错题和暗记会继续被作业挤到后面，最后只能考前一起爆发。";

  // Subject rule: ensure subject appears at least once.
  if (subjectCn && out.keep_2.indexOf(subjectCn) === -1) {
    out.keep_2 = subjectKeyProblems_(subjectCn);
  }

  // Secondary problem sentence (optional)
  if (secondaryKey) {
    if (secondaryKey === "late_study") out.secondary_problem = "学习时间已经偏晚，越到后面越容易进入疲劳循环。";
    else if (secondaryKey === "too_many_mistakes") out.secondary_problem = "错题没弄明白时，做得越多越容易空转。";
    else if (secondaryKey === "homework_too_much") out.secondary_problem = "作业占比过高时，复习和订正会被持续挤压。";
    else if (secondaryKey === "test_review") out.secondary_problem = "测试复习如果总被挤到最后，会更容易在考前爆发。";
    else if (secondaryKey === "subject_block") out.secondary_problem = subjectCn ? subjectCn + "是这一周最容易卡住的点。" : "";
  }

  return out;
}

function generateLearningPackage(diagnosisId) {
  var id = safeString(diagnosisId).trim();
  if (!id) return { ok: false, error: "BAD_REQUEST" };

  var diagnosisSheet = getDiagnosisSheet();
  var found = findRowByDiagnosisId_(diagnosisSheet, id);
  if (!found) return { ok: false, error: "DIAGNOSIS_NOT_FOUND" };

  var headers = found.headers;
  var row = found.row;
  var diagnosisType = getRowValue_(headers, row, "diagnosisType");
  var packageType = normalizePackageType_(diagnosisType);

  var dims = {
    homework_load: Number(getRowValue_(headers, row, "homework_load") || 0),
    review_retention: Number(getRowValue_(headers, row, "review_retention") || 0),
    planning: Number(getRowValue_(headers, row, "planning") || 0),
    parent_involvement: Number(getRowValue_(headers, row, "parent_involvement") || 0),
    autonomy: Number(getRowValue_(headers, row, "autonomy") || 0),
    mental_load: Number(getRowValue_(headers, row, "mental_load") || 0),
  };

  var followup = getLatestFollowup_(id);
  var fHeaders = followup ? followup.headers : [];
  var fRow = followup ? followup.row : null;

  function f(key) {
    if (!fRow) return "";
    var i = fHeaders.indexOf(key);
    if (i < 0) return "";
    return safeString(fRow[i]);
  }

  // Build followup object (prefer v2 keys, fallback to legacy).
  var followupObj = {
    grade_stage: f("grade_stage"),
    juku_type: f("juku_type"),
    study_end_time: f("study_end_time") || f("weekday_end_time"),
    hardest_subject: f("hardest_subject") || f("weak_subject"),
    current_main_problem: f("current_main_problem") || f("main_problem"),
    sacrificed_area: f("sacrificed_area") || f("hardest_tradeoff"),
    hardest_tradeoff: f("hardest_tradeoff"),
    memo: f("memo"),
    // legacy
    grade: f("grade"),
    weekday_end_time: f("weekday_end_time"),
    weak_subject: f("weak_subject"),
    main_problem: f("main_problem"),
    parent_role: f("parent_role"),
  };

  var rules = derivePackageRules_({ diagnosisType: diagnosisType, dimensions: dims }, followupObj);

  var weeklyFocus = buildWeeklyFocus_(dims, followupObj);
  var summary = buildPackageSummary_(weeklyFocus, { diagnosisType: diagnosisType, dimensions: dims }, followupObj, rules);
  var mainSummary = safeString(summary.one_line_conclusion || rules.primary_problem).trim();

  var narrative = buildPackageNarrative_(weeklyFocus, { diagnosisType: diagnosisType, dimensions: dims }, followupObj, rules);
  var dayTemplates = build7DayPlan_(weeklyFocus, packageType, followupObj, rules);

  var out = {
    created_at: new Date().toISOString(),
    diagnosis_id: id,
    diagnosis_type: packageType,
    primary_problem: safeString(summary.surface_problem || rules.primary_problem),
    secondary_problem: safeString(summary.real_problem || rules.secondary_problem),
    main_summary: mainSummary,
    surface_problem: safeString(summary.surface_problem),
    real_problem: safeString(summary.real_problem),
    keep_1: safeString(summary.keep_1),
    keep_2: safeString(summary.keep_2),
    keep_3: safeString(summary.keep_3),
    reduce_1: safeString(summary.reduce_1),
    reduce_2: safeString(summary.reduce_2),
    reduce_3: safeString(summary.reduce_3),
    parent_check_1: safeString(summary.parent_do_1 || rules.parent_check_1),
    parent_check_2: safeString(summary.parent_do_2 || rules.parent_check_2),
    keep_reason_1: safeString(rules.keep_reason_1),
    keep_reason_2: safeString(rules.keep_reason_2),
    reduce_reason_1: safeString(rules.reduce_reason_1),
    reduce_reason_2: safeString(rules.reduce_reason_2),
    parent_check_reason_1: safeString(rules.parent_check_reason_1),
    parent_check_reason_2: safeString(rules.parent_check_reason_2),
    parent_do_1: safeString(summary.parent_do_1),
    parent_do_2: safeString(summary.parent_do_2),
    parent_stop_1: safeString(summary.parent_stop_1),
    parent_stop_2: safeString(summary.parent_stop_2),
    child_focus: safeString(summary.child_focus),
    observation_1: safeString(summary.observation_1),
    observation_2: safeString(summary.observation_2),
    observation_3: safeString(summary.observation_3),
    judgement_reason_1: safeString(summary.judgement_reason_1),
    judgement_reason_2: safeString(summary.judgement_reason_2),
    judgement_reason_3: safeString(summary.judgement_reason_3),
    weekly_focus: safeString(summary.focus_theme || weeklyFocus),
    focus_theme: safeString(summary.focus_theme || weeklyFocus),
    one_line_conclusion: safeString(summary.one_line_conclusion),
    parent_goal: safeString(summary.parent_goal),
    child_goal: safeString(summary.child_goal),
    keep_reason: safeString(summary.keep_reason),
    reduce_reason: safeString(summary.reduce_reason),
    tonight_action: safeString(summary.tonight_action),
    tomorrow_action: safeString(summary.tomorrow_action),
    this_week_action: safeString(summary.this_week_action),
    weekend_action: safeString(summary.weekend_action),
    pause_1: safeString(summary.pause_1),
    pause_2: safeString(summary.pause_2),
    pause_3: safeString(summary.pause_3),
    day1_focus: dayTemplates[0].focus,
    day1_parent_check: dayTemplates[0].check,
    day2_focus: dayTemplates[1].focus,
    day2_parent_check: dayTemplates[1].check,
    day3_focus: dayTemplates[2].focus,
    day3_parent_check: dayTemplates[2].check,
    day4_focus: dayTemplates[3].focus,
    day4_parent_check: dayTemplates[3].check,
    day5_focus: dayTemplates[4].focus,
    day5_parent_check: dayTemplates[4].check,
    day6_focus: dayTemplates[5].focus,
    day6_parent_check: dayTemplates[5].check,
    day7_focus: dayTemplates[6].focus,
    day7_parent_check: dayTemplates[6].check,
    payment_status: "",
    pdf_status: "",
    sent_status: "",
    pdf_url: "",
    doc_url: "",
  };

  // Write to package_outputs
  var pkgSheet = getOrCreateSheet_(PACKAGE_SHEET_NAME, getPackageHeaders());
  var pkgHeaders = getPackageHeaders();
  var rowValues = pkgHeaders.map(function (k) { return safeString(out[k]); });
  pkgSheet.appendRow(rowValues);

  try {
    syncOperationDashboard_(id);
  } catch (dashErr) {
    Logger.log("operation_dashboard sync failed: " + safeString(dashErr));
  }

  return { ok: true, diagnosisId: id, diagnosisType: packageType };
}

function build7DayPlan_(weeklyFocus, packageType, followup, rules) {
  var focus = safeString(weeklyFocus).trim() || determineWeeklyFocus_((followup && followup.dimensions) || {}, followup);
  var base = build7DayTemplate_(packageType);
  var subjectCn = normalizeSubjectCn_(safeString(followup && (followup.hardest_subject || followup.weak_subject)).trim()) || "最卡的科目";
  var late = isLateStudyEndTime_(safeString(followup && followup.study_end_time).trim());

  function setDay(index, focusText, checkText) {
    base[index].focus = focusText;
    base[index].check = checkText;
  }

  if (focus === "作业取舍") {
    setDay(0, "Day1：把本周塾作业分成三类：必须提交、需要完成、可以暂缓。", "今天有没有真的划掉1〜2项可以暂缓的内容？");
    setDay(1, "Day2：只看" + subjectCn + "里最卡的2〜3个问题，不追求多。", "今天有没有把这2〜3个问题重新弄明白？");
    setDay(2, "Day3：留10分钟复习和整理，不再继续加量。", "今天有没有留出10分钟复习和整理？");
    setDay(3, "Day4：确认有没有又回到“全部都要做完”的状态。", "今天有没有继续分清必须做和可以暂缓？");
    setDay(4, "Day5：看看本周减少的内容是不是真的少了。", "省下来的时间有没有用在复习、订正或早点休息？");
    setDay(5, late ? "Day6：晚上只做收尾，不再临时加任务。" : "Day6：只补一个最重要的缺口，不再临时扩大战线。", late ? "今天22点后有没有停止新增任务？" : "今天有没有控制住“再加一点”的冲动？");
    setDay(6, "Day7：整理下周继续保留的2件事、继续减少的2件事。", "下周最先守住的一件事是什么？");
  } else if (focus === "错题整理") {
    setDay(0, "Day1：先挑出最常错的2〜3题，不要全部摊开。", "今天有没有把其中2〜3题重新弄明白？");
    setDay(1, "Day2：让孩子不看答案，重新做其中1题。", "孩子能不能说出自己为什么错？");
    setDay(2, "Day3：每天只处理一道最重要的错题。", "今天的错题有没有真的弄懂？");
    setDay(3, "Day4：看看同类错误有没有少一点。", "今天的订正有没有从写完变成弄懂？");
    setDay(4, "Day5：整理本周还要继续盯住的2个错误类型。", "同类错误有没有减少？");
    setDay(5, "Day6：只保留最值得反复看的2〜3题。", "今天有没有继续只抓少量高频错题？");
    setDay(6, "Day7：复盘：下周还要继续盯住哪些错题。", "下周还要盯住哪2类错误？");
  } else if (focus === "家长放手") {
    setDay(0, "Day1：先让孩子自己说出明天第一件要做的事。", "孩子今天有没有先说出第一件事？");
    setDay(1, "Day2：只确认第一件事有没有开始，不立刻追加。", "今天有没有少催一点？");
    setDay(2, "Day3：每天少管一个环节，让孩子自己做一次选择。", "孩子有没有自己做一次选择？");
    setDay(3, "Day4：把“下一步做什么”交给孩子说出来。", "孩子能不能自己说下一步？");
    setDay(4, "Day5：看看家长催促的次数有没有减少。", "今天有没有少接管一次？");
    setDay(5, "Day6：让孩子自己开始一次，不从头管到尾。", "今天有没有让孩子自己开始？");
    setDay(6, "Day7：和孩子一起确认下周哪一件事可以自己决定。", "下周哪一件事可以交给孩子决定？");
  } else if (focus === "优先级整理") {
    setDay(0, "Day1：把测试范围分成“必须守住”和“暂时不追”。", "今天有没有先分清必须做和可以之后再看？");
    setDay(1, "Day2：先复习最容易拿分但也最容易忘的内容。", "今天有没有先做最重要的测试范围？");
    setDay(2, "Day3：每天从固定复习入口开始，不再临时决定。", "今天有没有从固定入口开始？");
    setDay(3, "Day4：不要测试前临时扩大范围。", "今天有没有把难题放在后面？");
    setDay(4, "Day5：看一看临时追加内容是不是少了。", "临时追加内容有没有减少？");
    setDay(5, "Day6：只保留最容易失分的基础内容。", "今天有没有先守住基础分？");
    setDay(6, "Day7：整理下次测试前需要提前准备的2件事。", "下次测试前最先准备什么？");
  } else if (focus === "学习节奏调整") {
    setDay(0, "Day1：先定一个结束时间，到点后不再追加。", "今天有没有先定结束时间？");
    setDay(1, "Day2：只守住当天最重要的一件事。", "今天有没有少一点硬撑？");
    setDay(2, "Day3：每天保留一个短复习时间。", "今天有没有留出短复习时间？");
    setDay(3, "Day4：晚上只做收尾，不再继续加任务。", "今天有没有在疲劳后停止新增任务？");
    setDay(4, "Day5：看一看晚上结束时间是不是稳定了。", "晚上结束时间是否稳定？");
    setDay(5, "Day6：优先保住休息，不要再把当天塞满。", "今天有没有比平时早一点结束？");
    setDay(6, "Day7：整理下周最容易让家庭崩掉的一个时间段。", "下周最要先守住什么时间段？");
  } else {
    setDay(0, "Day1：先把本周最重要的一件事定下来。", "今天最重要的一件事是什么？");
    setDay(1, "Day2：只抓最卡的2〜3个问题，不要一下子铺太多。", "孩子能不能说出这2〜3个问题卡在哪里？");
    setDay(2, "Day3：安排一次短复习，补一补最容易忘的地方。", "今天有没有留一点时间做复习和整理？");
    setDay(3, "Day4：确认有没有又开始什么都想做完。", "今天有没有继续保留必须做和可以暂缓的区分？");
    setDay(4, "Day5：检查减少的内容有没有真的减少。", "今天有没有把省下来的时间用于复习、订正或早点休息？");
    setDay(5, late ? "Day6：晚上只做收尾，不再扩张。" : "Day6：只补一个最重要的缺口。", "今天有没有控制住再加一点的冲动？");
    setDay(6, "Day7：整理下周继续保留和继续减少的内容。", "下周最先守住的一件事是什么？");
  }

  return base;
}

function build7DayTemplate_(packageType) {
  var t = safeString(packageType).trim();
  // Minimal, stable templates (no AI, no long schedules)
  var base = [
    { focus: "Day1：整理本周要做的清单（先分必做/可减）", check: "今天必做是什么？可减是什么？" },
    { focus: "Day2：最卡科目只抓关键2〜3题（先弄明白）", check: "今天有没有把2〜3题重新弄明白？" },
    { focus: "Day3：安排一次轻量复习（不加量，只补缺口）", check: "今天有没有留出一点时间复习和整理？" },
    { focus: "Day4：把“明天第一件事”固定下来", check: "明天第一件事是什么？" },
    { focus: "Day5：测试前准备改成“少量复习整理”模式", check: "测试前是不是又开始赶？" },
    { focus: "Day6：做一次任务减法（去掉重复/深夜任务）", check: "今天减少了哪一项？" },
    { focus: "Day7：复盘：下周继续保留什么、减少什么", check: "下周要保留2件、减少2件是什么？" },
  ];

  if (t === "負荷過多型") {
    base[1].focus = "Day2：先把宿题“减法”做出来（不要追全量）";
    base[2].focus = "Day3：把复习/订正放回日常（每天一点点）";
  } else if (t === "表面努力型") {
    base[1].focus = "Day2：错题只抓2〜3题：看“为什么错”+“怎么改”";
    base[2].focus = "Day3：把“做完”改成“改完”";
  } else if (t === "計画混乱型") {
    base[0].focus = "Day1：整理顺序：先做什么、先不做什么";
    base[3].focus = "Day4：每天固定一个开始流程（先从第一件事开始）";
  } else if (t === "親主導型") {
    base[3].focus = "Day4：把“下一步做什么”交给孩子说出来";
    base[3].check = "孩子能说出下一步是什么吗？";
  } else if (t === "不安定型") {
    base[0].focus = "Day1：把学习开始流程固定（同一个时间/同一个顺序）";
    base[4].focus = "Day5：测试前不要重启，改成小幅复习整理";
  }

  return base;
}

function normalizeSingleLine(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTopRisks(payload) {
  // Expected: payload.riskTopRisks is a JSON stringified array.
  var raw = payload && payload.riskTopRisks;
  if (!raw) return [];

  try {
    var parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

function dimensionLabel(dimension) {
  var d = safeString(dimension).trim();
  if (d === "homework_load") return "宿題負荷";
  if (d === "review_retention") return "復習（ちゃんと身についているか）";
  if (d === "planning") return "計画・優先順位";
  if (d === "parent_involvement") return "親の関与過多";
  if (d === "autonomy") return "自走性不足";
  if (d === "mental_load") return "精神的負荷";
  return d;
}

function cnDimensionLabel(dimension) {
  var d = safeString(dimension).trim();
  if (d === "homework_load") return "作业负荷";
  if (d === "review_retention") return "复习后没有真正掌握";
  if (d === "planning") return "学习的先后顺序";
  if (d === "parent_involvement") return "家长介入过多";
  if (d === "autonomy") return "自主性不足";
  if (d === "mental_load") return "精神负荷";
  return d;
}

function buildTopRiskSummary(topRisks) {
  if (!topRisks || !topRisks.length) return "";

  var labels = topRisks
    .slice(0, 2)
    .map(function (r) {
      if (r && typeof r === "object") {
        var label = safeString(r.label);
        if (label) return label;
        return dimensionLabel(r.dimension);
      }
      return "";
    })
    .filter(function (s) {
      return safeString(s).trim() !== "";
    });

  if (!labels.length) return "";
  return labels.join("と") + "が目立っています。";
}

function buildCnTopRiskLines(topRisks) {
  if (!topRisks || !topRisks.length) return [];
  var lines = topRisks
    .slice(0, 2)
    .map(function (r) {
      if (!r || typeof r !== "object") return "";
      var dim = r.dimension;
      var label = cnDimensionLabel(dim);
      return label;
    })
    .filter(function (s) {
      return safeString(s).trim() !== "";
    });
  return lines;
}

function buildCnTypeDescription(typeKey) {
  // Internal type keys from riskModel.type (Japanese). Return Chinese explanation.
  switch (typeKey) {
    case "安定運用型":
      return "目前整体还算稳定，但需要继续定期检查复习与考试前的节奏。";
    case "負荷過多型":
      return "当前最大问题是作业负荷和精神负荷同时偏高，先别继续加量。";
    case "不安定型":
      return "多个环节同时不稳定，说明需要先把家庭学习节奏整理回来。";
    case "親主導型":
      return "目前学习较依赖家长推动，短期能维持进度，但长期会越来越累。";
    case "表面努力型":
      return "作业看起来完成了，但订正、复习和理解整理容易跟不上。";
    case "計画不明型":
      return "现在更需要整理“先做什么”，把优先级理清，而不是更努力。";
    case "要観察型":
      return "暂时没有集中爆发的问题，但已经出现需要留意和微调的点。";
    default:
      return "目前家庭学习中出现了一些需要整理的地方。";
  }
}

function ensureCnPeriod(text) {
  var t = String(text || "").trim();
  if (!t) return "";
  return /[。！？!?]$/.test(t) ? t : t + "。";
}

function normalizeMailText(value) {
  var s = safeString(value);
  if (!s) return "";

  // If it's JSON-ish text, keep as-is (we don't want to parse arbitrary objects here).
  // Normalize whitespace / line breaks for readability in emails.
  s = String(s)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/、\s*\n/g, "、")
    .replace(/。\s*\n/g, "。")
    .trim();

  return s;
}

function ensureJapanesePeriod(text) {
  var t = String(text || "").trim();
  if (!t) return "";
  return /[。！？]$/.test(t) ? t : t + "。";
}

function ensurePeriod(s) {
  var v = safeString(s).trim();
  if (!v) return "";
  // If it already ends with Japanese punctuation or a closing quote, leave it.
  if (/[。！？!?」』）\)]$/.test(v)) return v;
  return v + "。";
}

function pickSituationItems(value, maxItems) {
  var items = [];

  if (Array.isArray(value)) {
    items = value.map(function (v) {
      return safeString(v);
    });
  } else if (typeof value === "string") {
    var raw = String(value || "").trim();
    // Defensive: if a JSON-stringified array leaked in, parse it.
    if (raw && raw.charAt(0) === "[" && raw.charAt(raw.length - 1) === "]") {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          items = parsed.map(function (v) {
            return safeString(v);
          });
        } else {
          items = [raw];
        }
      } catch (e) {
        items = [raw];
      }
    } else {
      items = raw.split("\n").map(function (line) {
        return safeString(line);
      });
    }
  } else if (value === null || value === undefined) {
    items = [];
  } else {
    items = [safeString(value)];
  }

  items = items
    .map(function (s) {
      return safeString(s).replace(/^[・\-\u2022]\s*/, "").trim();
    })
    .filter(function (s) {
      return s !== "";
    });

  return items.slice(0, maxItems || 3);
}

function pickFirstAction(value) {
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      var s = safeString(value[i]).trim();
      if (s) return s;
    }
  }
  var s2 = safeString(value).trim();
  return s2 || "まずは、無理のない範囲で「今いちばん苦しくなっているところ」から見直してみてください。";
}

function formatList(value) {
  if (Array.isArray(value)) {
    return value
      .map(function (item) {
        return "・" + safeString(item);
      })
      .join("\n");
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return safeString(value);
}

function safeString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return "";
    }
  }

  return String(value);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
