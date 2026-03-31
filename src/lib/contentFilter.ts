// ======================== Content Filter ========================
// Lightweight client-side profanity / NSFW filter for chat messages.

const BAD_WORDS_RU = [
  'блять', 'сука', 'хуй', 'пизд', 'ебать', 'ебан', 'нахуй', 'пошёл нахуй',
  'мудак', 'пидор', 'дебил', 'шлюха', 'бля', 'ёб', 'хуе', 'пизда', 'залупа',
  'говно', 'срать', 'жопа',
];

const BAD_WORDS_EN = [
  'fuck', 'shit', 'asshole', 'bitch', 'dick', 'pussy', 'cunt',
  'nigger', 'faggot', 'slut', 'whore', 'porn', 'xxx', 'nsfw',
];

const ALL_BAD = [...BAD_WORDS_RU, ...BAD_WORDS_EN];

/**
 * Check if text contains NSFW / profanity content.
 */
export function containsNSFW(text: string): boolean {
  const lower = text.toLowerCase();
  return ALL_BAD.some(word => lower.includes(word));
}

/**
 * Replace profanity from text with asterisks, return sanitized version.
 */
export function filterContent(text: string): { clean: string; flagged: boolean } {
  let clean = text;
  let flagged = false;

  const lower = text.toLowerCase();
  for (const word of ALL_BAD) {
    if (lower.includes(word)) {
      flagged = true;
      const regex = new RegExp(escapeRegex(word), 'gi');
      clean = clean.replace(regex, '*'.repeat(word.length));
    }
  }

  return { clean, flagged };
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
