const SPREADSHEET_ID = "1-UhodIWz4ViAJH5ZGaqSO4meh7IRkzn7m9QIK-jvlbo";

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
    "※本診断は、家庭学習の状態整理を目的とした簡易診断です。";

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
  });

  return true;
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
