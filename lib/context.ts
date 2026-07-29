/**
 * プロジェクトファイルをプロンプトへ載せる。
 * WHY 上限: プロバイダのコンテキスト窓を食い潰さないためのソフト上限。
 * 厳密なトークン計測はしない（MVP）。文字数ベースで頭から積む。
 */

export const MAX_CONTEXT_CHARS = 48_000;

export type ContextFile = {
  name: string;
  text: string;
};

export function buildProjectContext(
  files: ContextFile[],
  budget = MAX_CONTEXT_CHARS,
): string {
  if (files.length === 0) return "";

  const chunks: string[] = [
    "以下はユーザーがこのプロジェクトに保存した資料です。回答時はこれらを優先根拠にしてください。",
  ];
  let used = chunks[0].length;

  for (const file of files) {
    const body = file.text.trim();
    if (!body) continue;
    const header = `\n\n### ファイル: ${file.name}\n`;
    const room = budget - used - header.length;
    if (room <= 0) break;
    const slice = body.slice(0, room);
    chunks.push(header + slice);
    used += header.length + slice.length;
    if (slice.length < body.length) {
      chunks.push("\n…(以降は長さ上限のため省略)");
      break;
    }
  }

  return chunks.join("");
}

/** システム指示 + プロジェクト文脈を結合 */
export function composeSystemPrompt(
  base: string,
  files: ContextFile[],
): string {
  const ctx = buildProjectContext(files);
  if (!ctx) return base;
  return `${base}\n\n---\n${ctx}`;
}
