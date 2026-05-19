export function formatCopyParagraphs(
  lines: string[],
  options?: {
    maxParagraphs?: number;
    maxCharsPerParagraph?: number;
  }
): string[] {
  const maxParagraphs = options?.maxParagraphs ?? 3;
  const maxCharsPerParagraph = options?.maxCharsPerParagraph ?? 160;

  const cleaned = (lines ?? [])
    .map((l) => String(l ?? "").replace(/\r\n/g, "\n").trim())
    .filter((l) => l.length > 0);

  const mergedSentences: string[] = [];
  let buffer = "";

  const flush = () => {
    const v = buffer.trim();
    if (v) mergedSentences.push(v);
    buffer = "";
  };

  const shouldJoinNext = (text: string) => /[、,，]$/.test(text.trim());
  const isTooShort = (text: string) => text.trim().length <= 12;

  for (const line of cleaned) {
    const part = line.replace(/\s+/g, " ").trim();
    if (!buffer) {
      buffer = part;
      continue;
    }

    // Join if the previous ends with a comma-like character, or the current fragment is too short.
    if (shouldJoinNext(buffer) || isTooShort(buffer) || isTooShort(part)) {
      buffer = `${buffer} ${part}`.replace(/\s+([、。])/g, "$1").trim();
      continue;
    }

    // Split before starting a new sentence chunk.
    flush();
    buffer = part;
  }
  flush();

  // Group into natural paragraphs without making them too long.
  const paragraphs: string[] = [];
  let para = "";

  const flushPara = () => {
    const v = para.trim();
    if (v) paragraphs.push(v);
    para = "";
  };

  for (const sentence of mergedSentences) {
    if (!para) {
      para = sentence;
      continue;
    }

    const candidate = `${para} ${sentence}`.replace(/\s+/g, " ").trim();
    if (candidate.length <= maxCharsPerParagraph) {
      para = candidate;
    } else {
      flushPara();
      para = sentence;
    }
  }
  flushPara();

  return paragraphs.slice(0, maxParagraphs);
}

