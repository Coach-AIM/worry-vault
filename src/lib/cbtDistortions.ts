export type DistortionType = {
  id: string;
  name: string;
  description: string;
  keywords: string[];
};

export const DISTORTIONS: DistortionType[] = [
  {
    id: "mind-reading",
    name: "Mind Reading",
    description:
      "Assuming you know what others are thinking negatively about you.",
    keywords: [
      "not like me",
      "doesn't like me",
      "does not like me",
      "they think",
      "he thinks",
      "she thinks",
      "must hate me",
      "mad at me",
      "angry at me",
      "angry with me",
      "annoyed with me",
      "dislikes me",
      "hates me",
      "hate me",
      "probably thinks",
      "thinks i'm",
      "thinks i am",
      "must think",
      "they all think",
      "everyone thinks",
      "everybody thinks",
      "he must not like",
      "she must not like",
      "they must not like",
    ],
  },
  {
    id: "all-or-nothing",
    name: "All-or-Nothing Thinking",
    description: "Thinking in absolute, black-and-white terms.",
    keywords: [
      "always",
      "never",
      "ruined",
      "perfect",
      "everything",
      "nothing",
      "completely",
      "impossible",
      "failed",
      "failure",
    ],
  },
  {
    id: "catastrophizing",
    name: "Catastrophizing",
    description: "Expecting the absolute worst case scenario.",
    keywords: [
      "disaster",
      "terrible",
      "worst",
      "awful",
      "end of the world",
      "horrible",
      "tragic",
    ],
  },
  {
    id: "should-statements",
    name: "Should Statements",
    description: "Placing unreasonable demands on yourself or others.",
    keywords: ["should", "ought to", "have to", "supposed to", "must"],
  },
  {
    id: "emotional-reasoning",
    name: "Emotional Reasoning",
    description:
      "Believing that because you feel a specific way, it must be true.",
    keywords: [
      "feel like",
      "feels like",
      "i feel stupid",
      "i feel useless",
      "i feel like a",
    ],
  },
  {
    id: "overgeneralization",
    name: "Overgeneralization",
    description:
      "Taking one negative event as a never-ending pattern of defeat.",
    keywords: [
      "every time",
      "everybody",
      "nobody",
      "everyone",
      "always happens",
      "never works",
    ],
  },
];

export function isInterpersonalAssumption(text: string): boolean {
  const clean = text.toLowerCase();
  const interpersonalPatterns = [
    /\b(?:he|she|they|everyone|everybody|people|someone|nobody)\s+(?:must\s+)?(?:not\s+like|hate|dislike|think|be\s+mad|be\s+angry|be\s+annoyed)\b/i,
    /\bmust\s+(?:not\s+like|hate|dislike|think|be\s+mad|be\s+angry|be\s+annoyed|despise)\b/i,
    /\b(?:he|she|they|everyone|everybody)\s+must\b/i,
    /\b(?:not\s+like\s+me|doesn't\s+like\s+me|does\s+not\s+like\s+me|must\s+hate\s+me|mad\s+at\s+me|angry\s+at\s+me)\b/i,
  ];
  return interpersonalPatterns.some((pattern) => pattern.test(clean));
}

export function findDistortions(text: string): DistortionType[] {
  const lowerText = text.toLowerCase();
  const found: DistortionType[] = [];
  const interpersonal = isInterpersonalAssumption(lowerText);

  for (const distortion of DISTORTIONS) {
    if (distortion.id === "should-statements") {
      // Check if keywords other than "must" match (e.g. should, ought to, have to, supposed to)
      const nonMustKeywords = distortion.keywords.filter((k) => k !== "must");
      const hasNonMust = nonMustKeywords.some((k) => lowerText.includes(k));
      // "must" only triggers Should Statements if it's NOT an interpersonal assumption
      const hasNormativeMust = lowerText.includes("must") && !interpersonal;
      if (hasNonMust || hasNormativeMust) {
        found.push(distortion);
      }
    } else {
      if (
        distortion.keywords.some((keyword) =>
          lowerText.includes(keyword.toLowerCase()),
        )
      ) {
        found.push(distortion);
      }
    }
  }

  // Prioritize "Mind Reading" at the front of the list
  found.sort((a, b) => {
    if (a.id === "mind-reading") return -1;
    if (b.id === "mind-reading") return 1;
    return 0;
  });

  return found;
}

export function detectThinkingTraps(text: string): string[] {
  const identifiedTraps: string[] = [];
  const cleanText = text.toLowerCase();
  const interpersonal = isInterpersonalAssumption(cleanText);

  // 1. Mind Reading Checks (prioritized first)
  if (
    cleanText.includes("not like me") ||
    cleanText.includes("doesn't like me") ||
    cleanText.includes("does not like me") ||
    cleanText.includes("they think") ||
    cleanText.includes("he thinks") ||
    cleanText.includes("she thinks") ||
    cleanText.includes("must hate me") ||
    cleanText.includes("mad at me") ||
    cleanText.includes("angry at me") ||
    cleanText.includes("annoyed") ||
    cleanText.includes("probably don't") ||
    cleanText.includes("probably thinks") ||
    cleanText.includes("thinks i'm") ||
    interpersonal
  ) {
    identifiedTraps.push("Mind Reading");
  }

  // 2. All-or-Nothing / Overgeneralization Checks
  if (
    cleanText.includes("always") ||
    cleanText.includes("never") ||
    cleanText.includes("ruined") ||
    cleanText.includes("completely")
  ) {
    if (!identifiedTraps.includes("All-or-Nothing Thinking")) {
      identifiedTraps.push("All-or-Nothing Thinking");
    }
  }

  // 3. Catastrophizing Checks
  if (
    cleanText.includes("disaster") ||
    cleanText.includes("catastrophe") ||
    cleanText.includes("worst")
  ) {
    if (!identifiedTraps.includes("Catastrophizing")) {
      identifiedTraps.push("Catastrophizing");
    }
  }

  // 4. Should Statements Checks (do NOT trigger on interpersonal "must")
  const hasShould =
    cleanText.includes("should") ||
    cleanText.includes("ought to") ||
    cleanText.includes("have to") ||
    cleanText.includes("supposed to") ||
    (cleanText.includes("must") && !interpersonal);

  if (hasShould) {
    if (!identifiedTraps.includes("Should Statements")) {
      identifiedTraps.push("Should Statements");
    }
  }

  return identifiedTraps;
}
