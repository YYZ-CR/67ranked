// Moderate profanity filter for usernames
// Uses a custom list since 'bad-words' package might be too aggressive

const PROFANE_WORDS = new Set([
  // Common profanity (keeping list moderate)
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'piss',
  'dick', 'cock', 'pussy', 'cunt', 'fag', 'faggot',
  'nigger', 'nigga', 'retard', 'rape', 'rapist',
  'whore', 'slut', 'bastard', 'asshole', 'motherfucker',
  // Leetspeak variants
  'f4ck', 'sh1t', 'b1tch', 'f4g', 'n1gger', 'n1gga',
  // Common variations
  'fuk', 'fck', 'sht', 'btch', 'dck', 'psy', 'cnt'
]);

// Normalize text for matching
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0-9]/g, (char) => {
      const map: Record<string, string> = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b'
      };
      return map[char] || char;
    })
    .replace(/[^a-z]/g, '');
}

// Check if username contains profanity
export function containsProfanity(username: string): boolean {
  const normalized = normalize(username);
  
  // Check exact match
  if (PROFANE_WORDS.has(normalized)) {
    return true;
  }
  
  // Check if any profane word is contained within
  for (const word of PROFANE_WORDS) {
    if (normalized.includes(word)) {
      return true;
    }
  }
  
  return false;
}

// Validate username format and content
export function validateUsername(username: string): { valid: boolean; reason?: string } {
  // Check length
  if (!username || username.length < 1) {
    return { valid: false, reason: 'Username is required' };
  }
  
  if (username.length > 20) {
    return { valid: false, reason: 'Username must be 20 characters or less' };
  }
  
  // Check format (letters, numbers, underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, reason: 'Username can only contain letters, numbers, and underscores' };
  }
  
  // Check profanity
  if (containsProfanity(username)) {
    return { valid: false, reason: 'Username contains inappropriate language' };
  }
  
  return { valid: true };
}
