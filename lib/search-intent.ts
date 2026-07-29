/**
 * 「調べて」系の発話・入力を検知する。
 * WHY ルールベース: Voice はモデル側 tools に任せるが、UI 表示と
 * テキスト経路の Responses API 切替にはクライアント側の先行検知が要る。
 * ゆるめに取る（誤検知で検索しても害は小さい。取りこぼしの方が体験を壊す）。
 */

const PATTERNS: RegExp[] = [
  /調べて/,
  /調べよう/,
  /調べてみ/,
  /検索して/,
  /検索してくれ/,
  /サーチして/,
  /ググって/,
  /最新を/,
  /最新情報/,
  /ネットで/,
  /ウェブで/,
  /web\s*で/i,
  /\blook\s*up\b/i,
  /\bsearch\s+(for|the|it|this|that)\b/i,
  /\bgoogle\s+(it|that|this)\b/i,
  /\bfind\s+out\b/i,
  /\bcheck\s+(online|the\s+web|the\s+internet)\b/i,
];

export function hasSearchIntent(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return PATTERNS.some((re) => re.test(t));
}

/** システム指示に載せる検索ポリシー（Voice / Chat 共通） */
export const SEARCH_POLICY_JA = [
  "ユーザーが「調べて」「検索して」「look up」「search for」など検索を促したら、必ず web_search ツールで実際に検索してから答える。",
  "検索せずに知っているふりをしない。検索中は短く進捗を口頭または文言で伝えてよい。",
  "検索不要な雑談・資料内の質問にはツールを使わない。",
].join(" ");
