export function clip(text, limit = 1024) {
  if (!text) return "";
  return text.length > limit ? text.slice(0, limit - 3) + "…" : text;
}

export function fmtList(lines, maxLines = 6) {
  if (!lines || !lines.length) return "（無）";
  return lines.slice(0, maxLines).map((l, i) => `${i + 1}. ${l}`).join("\n");
}

export function fmtKeywords(words, maxItems = 12) {
  if (!words || !words.length) return "（無）";
  return words.slice(0, maxItems).map((w) => `\`${w}\``).join(" ");
}
