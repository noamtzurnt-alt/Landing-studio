const FENCE_RE = /```[\s\S]*?```/g;

export function stripCodeBlocks(text: string) {
  // Remove complete fenced blocks
  let withoutFences = text.replace(FENCE_RE, "");

  // If a fence started but hasn't closed yet, remove from first fence onward.
  const firstFenceIdx = withoutFences.indexOf("```");
  if (firstFenceIdx !== -1) {
    withoutFences = withoutFences.slice(0, firstFenceIdx);
  }

  withoutFences = withoutFences.trim();
  // Remove standalone labels the model might include
  return withoutFences
    .split(/\r?\n/)
    .filter((l) => !/^\s*(PREVIEW_TSX|PRODUCTION_TSX|PREVIEW|PRODUCTION)\s*$/i.test(l))
    .join("\n")
    .trim();
}

