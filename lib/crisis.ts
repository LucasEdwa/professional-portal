// Mirrors CRISIS_KEYWORDS in Homewithin/services/professional/chat.ts.
const CRISIS_KEYWORDS = [
  'suicid',
  'kill myself',
  'want to die',
  'end my life',
  'self harm',
  'hurt myself',
  "can't go on",
  'no reason to live',
  'overdose',
  // Swedish
  'självmord',
  'ta livet av mig',
  'vill dö',
  'skada mig själv',
];

export function containsCrisisKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}
