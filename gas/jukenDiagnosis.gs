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
  var name = safeString(payload.name || payload.parentName) || "保護者";
  var diagnosisLabel = safeString(
    payload.mailDiagnosisLabel ||
      payload.diagnosisLabel ||
      payload.diagnosisType ||
      "診断結果"
  );

  var currentTrend = safeString(payload.mailCurrentTrend);
  var problemSummary = safeString(payload.mailProblemSummary);
  var causes = formatList(payload.mailCauses);
  var actions = formatList(payload.mailThisWeekActions);
  var parentMessage = safeString(payload.mailParentMessage);

  var subject = "【家庭学習管理診断】診断結果：" + diagnosisLabel;

  var body =
    name +
    " 様\n\n" +
    "この度は、家庭学習管理診断をご利用いただきありがとうございます。\n" +
    "診断結果を以下にお送りします。\n\n" +
    "■ 診断結果\n" +
    diagnosisLabel +
    "\n\n" +
    "■ 現在の学習傾向\n" +
    currentTrend +
    "\n\n" +
    "■ 今、起きている問題\n" +
    problemSummary +
    "\n\n" +
    "■ 主な原因\n" +
    causes +
    "\n\n" +
    "■ 今週まず見直すこと\n" +
    actions +
    "\n\n" +
    "■ 保護者の方へ\n" +
    parentMessage +
    "\n\n" +
    "※本診断は、家庭学習の状態を整理するための簡易診断です。\n" +
    "医学的・心理的診断、または合格可能性の判定を行うものではありません。";

  MailApp.sendEmail({
    to: safeString(payload.email),
    subject: subject,
    body: body
  });
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

