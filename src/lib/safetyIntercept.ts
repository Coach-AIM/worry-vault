// Clinical safety intercept system
export const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "die",
  "hurt myself",
  "end it all",
  "hopeless",
];

/**
 * Scans input for crisis keywords.
 * Returns true if a crisis keyword is found, false otherwise.
 */
export function checkSafety(input: string): boolean {
  if (!input) return false;
  const lowerInput = input.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => lowerInput.includes(keyword));
}
