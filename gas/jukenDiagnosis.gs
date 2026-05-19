const SPREADSHEET_ID = "1-UhodlWz4ViAJH5ZGaqSO4meh7lRkzn7m9QlK-jvIbo";

// Manual check helper (run this from Apps Script editor to verify ID + permissions)
function testOpenSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log(ss.getName());
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
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheets()[0];

  var headers = getHeaders();
  ensureHeaders(sheet, headers);

  var row = headers.map(function (key) {
    if (key === "mailCauses" || key === "mailThisWeekActions") {
      return formatList(payload[key]);
    }
    return safeString(payload[key]);
  });

  sheet.appendRow(row);
  return true;
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
    "※本诊断面向在日华人中学受験家庭，用于整理家庭学习结构。";

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
  var sheet = spreadsheet.getSheets()[0];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { ok: false, error: "NOT_FOUND" };

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) { return safeString(v).trim(); });
  var idx = headers.indexOf("diagnosisId");
  if (idx < 0) return { ok: false, error: "NOT_FOUND" };

  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var found = null;
  for (var r = 0; r < values.length; r++) {
    if (safeString(values[r][idx]).trim() === diagnosisId) {
      found = values[r];
      break;
    }
  }
  if (!found) return { ok: false, error: "NOT_FOUND" };

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
    warning: warning || undefined,
  };
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
  if (d === "review_retention") return "復習・定着不足";
  if (d === "planning") return "計画・優先順位";
  if (d === "parent_involvement") return "親の関与過多";
  if (d === "autonomy") return "自走性不足";
  if (d === "mental_load") return "精神的負荷";
  return d;
}

function cnDimensionLabel(dimension) {
  var d = safeString(dimension).trim();
  if (d === "homework_load") return "宿题负荷";
  if (d === "review_retention") return "复习・定着不足";
  if (d === "planning") return "计划・优先顺位";
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
