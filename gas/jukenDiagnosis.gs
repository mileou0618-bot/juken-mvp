const SPREADSHEET_ID = "1-UhodIWz4ViAJH5ZGaqSO4meh7IRkzn7m9QIK-jvlbo";

function doPost(e) {
  try {
    var payload = parsePayload(e);

    var sheetResult = appendToSheet(payload);

    var mailSent = false;
    var mailError = "";

    if (safeString(payload.email)) {
      try {
        sendDiagnosisMail(payload);
        mailSent = true;
      } catch (mailErr) {
        mailError = String(mailErr && mailErr.message ? mailErr.message : mailErr);
        Logger.log("Mail send failed: " + mailError);
      }
    }

    return jsonResponse({
      ok: true,
      sheetAppended: sheetResult,
      mailSent: mailSent,
      mailError: mailError
    });
  } catch (err) {
    Logger.log("doPost failed: " + String(err && err.stack ? err.stack : err));
    return jsonResponse({
      ok: false,
      error: String(err && err.message ? err.message : err)
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
  try {
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
  } catch (err) {
    Logger.log("Sheet append failed: " + String(err && err.stack ? err.stack : err));
    throw new Error("Sheet append failed");
  }
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
    "mailParentMessage"
  ];
}

function ensureHeaders(sheet, headers) {
  var lastColumn = sheet.getLastColumn();

  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  var existingHeaders = sheet
    .getRange(1, 1, 1, Math.max(lastColumn, 1))
    .getValues()[0];

  var hasAnyHeader = existingHeaders.some(function (value) {
    return safeString(value) !== "";
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  var nextColumn = existingHeaders.length + 1;
  var headersToAppend = headers.filter(function (header) {
    return existingHeaders.indexOf(header) === -1;
  });

  if (headersToAppend.length > 0) {
    sheet
      .getRange(1, nextColumn, 1, headersToAppend.length)
      .setValues([headersToAppend]);
  }
}

function sendDiagnosisMail(payload) {
  var diagnosisLabel = safeString(
    payload.mailDiagnosisLabel ||
      payload.diagnosisLabel ||
      payload.diagnosisType ||
      "診断結果"
  );

  // Next.js側で mail* フィールドへマッピング済み：
  // - mailCurrentTrend: heroSummary
  // - mailCauses: currentSituation
  // - mailThisWeekActions: [thisWeekAction]
  var heroSummary = safeString(payload.mailCurrentTrend);
  var situationItems = pickSituationItems(payload.mailCauses, 3);
  var thisWeekAction = pickFirstAction(payload.mailThisWeekActions);

  var subject = "【診断結果】家庭学習の現在の状態をお送りします";

  var situationText = situationItems.length
    ? situationItems.join("、")
    : "";

  var body =
    "この度は、家庭学習管理診断をご利用いただきありがとうございます。\n\n" +
    "■診断結果\n" +
    "（" + diagnosisLabel + "）\n\n" +
    "今のご家庭では、\n" +
    heroSummary +
    "\n" +
    "という状態が見え始めています。\n\n" +
    (situationText
      ? "特に、\n" +
        situationText +
        "\n" +
        "が重なってくると、\n" +
        "成績より先に、\n" +
        "家庭内の負担が増えやすくなります。\n\n"
      : "") +
    "まず今週は、\n" +
    thisWeekAction +
    "\n" +
    "から整理してみてください。\n\n" +
    "必要であれば、\n" +
    "LINEで現在の状況を整理できます。\n\n" +
    "▼LINE相談\n" +
    "https://lin.ee/pxHFmsI\n\n" +
    "※本診断は、家庭学習の状態整理を目的とした簡易診断です。";

  MailApp.sendEmail({
    to: safeString(payload.email),
    subject: subject,
    body: body
  });
}

function pickSituationItems(value, maxItems) {
  var items = [];

  if (Array.isArray(value)) {
    items = value.map(function (v) {
      return safeString(v);
    });
  } else if (typeof value === "string") {
    items = value.split("\n").map(function (line) {
      return safeString(line);
    });
  } else if (value === null || value === undefined) {
    items = [];
  } else {
    items = [safeString(value)];
  }

  items = items
    .map(function (s) {
      return safeString(s)
        .replace(/^[・\-\u2022]\s*/, "")
        .trim();
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
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
