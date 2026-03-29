type Generated = {
  previewTsx: string;
  productionTsx: string;
};

function escapeRegExp(literal: string) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractFence(text: string, fenceLabel: string) {
  const label = escapeRegExp(fenceLabel);
  const re = new RegExp(
    `(?:^|\\n)\\\`\\\`\\\`(?:tsx|jsx|ts|js)?\\s*${label}\\s*\\n([\\s\\S]*?)\\n\\\`\\\`\\\`\\s*(?:\\n|$)`,
    "i",
  );
  const m = text.match(re);
  return m?.[1]?.trim() ?? null;
}

function extractFirstTsxFence(text: string) {
  const re = /(?:^|\n)```(?:tsx|jsx)\s*\n([\s\S]*?)\n```\s*(?:\n|$)/i;
  const m = text.match(re);
  return m?.[1]?.trim() ?? null;
}

function extractFenceAfterLabel(text: string, label: string) {
  // Supports model output like:
  // PREVIEW_TSX
  // ```tsx
  // ...
  // ```
  const lines = text.split(/\r?\n/);
  const target = label.toUpperCase();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.trim().toUpperCase() !== target) continue;
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const line = lines[j] ?? "";
      const fenceMatch = line.match(/^```(?:tsx|jsx|ts|js)?\s*$/i);
      if (!fenceMatch) continue;
      const body: string[] = [];
      for (let k = j + 1; k < lines.length; k++) {
        if (/^```/.test(lines[k] ?? "")) {
          return body.join("\n").trim() || null;
        }
        body.push(lines[k] ?? "");
      }
    }
  }
  return null;
}

export function extractGenerated(text: string): Partial<Generated> {
  const preview =
    extractFence(text, "PREVIEW_TSX") ??
    extractFenceAfterLabel(text, "PREVIEW_TSX") ??
    extractFence(text, "PREVIEW") ??
    extractFenceAfterLabel(text, "PREVIEW") ??
    null;
  const prod =
    extractFence(text, "PRODUCTION_TSX") ??
    extractFenceAfterLabel(text, "PRODUCTION_TSX") ??
    extractFence(text, "PRODUCTION") ??
    extractFenceAfterLabel(text, "PRODUCTION") ??
    null;

  const fallback = extractFirstTsxFence(text);

  return {
    previewTsx: preview ?? fallback ?? undefined,
    productionTsx: prod ?? undefined,
  };
}

