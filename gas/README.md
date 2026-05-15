# GAS 更新手順｜家庭学習管理診断

このディレクトリには、Google Apps Script エディタへコピーするためのコードを置いています。

## 対象ファイル

- `jukenDiagnosis.gs`

## 固定 Spreadsheet ID

現在の固定 Spreadsheet ID は以下です。

- `1-UhodIWz4ViAJH5ZGaqSO4meh7IRkzn7m9QIK-jvlbo`

将来シートを切り替える場合は、`jukenDiagnosis.gs` 冒頭の以下を差し替えてください。

- `const SPREADSHEET_ID = "...";`

Spreadsheet ID は Google Sheet URL の以下の位置です：

- `https://docs.google.com/spreadsheets/d/【ここ】/edit`

## 更新手順

1. Google Apps Script エディタを開く
2. 既存コードを必ずバックアップする
3. `gas/jukenDiagnosis.gs` の内容を全文コピーする
4. Apps Script エディタの既存コードを置き換える
5. 保存する
6. デプロイ → デプロイを管理
7. 現在の Web アプリを選択
8. 編集
9. バージョンを「新しいバージョン」にする
10. デプロイ
11. Web アプリ URL は変更しない

## テスト項目

- Sheet に新しい行が追加される
- `diagnosisType` が保存される
- `diagnosisLabel` が保存される
- `mailDiagnosisLabel` が保存される
- `mailCauses` が「・」付きの改行で保存される
- `mailThisWeekActions` が「・」付きの改行で保存される
- メールが届く
- メール本文が結果ページと同じ内容になる

