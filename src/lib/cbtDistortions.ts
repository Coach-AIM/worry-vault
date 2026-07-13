export type DistortionType = {
  id: string;
  name: string;
  description: string;
  keywords: string[];
};

export const DISTORTIONS: DistortionType[] = [
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
    keywords: ["should", "must", "ought to", "have to", "supposed to"],
  },
  {
    id: "mind-reading",
    name: "Mind Reading",
    description:
      "Assuming you know what others are thinking negatively about you.",
    keywords: [
      "he thinks",
      "she thinks",
      "they think",
      "probably thinks",
      "hates me",
      "thinks I'm",
    ],
  },
  {
    id: "emotional-reasoning",
    name: "Emotional Reasoning",
    description:
      "Believing that because you feel a specific way, it must be true.",
    keywords: [
      "feel like",
      "feels like",
      "I feel stupid",
      "I feel useless",
      "I feel like a",
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

export function findDistortions(text: string): DistortionType[] {
  const lowerText = text.toLowerCase();
  const found: DistortionType[] = [];

  for (const distortion of DISTORTIONS) {
    if (
      distortion.keywords.some((keyword) =>
        lowerText.includes(keyword.toLowerCase()),
      )
    ) {
      found.push(distortion);
    }
  }

  return found;
}

export function detectThinkingTraps(text: string): string[] {
  const identifiedTraps: string[] = [];
  const cleanText = text.toLowerCase();

  // 1. All-or-Nothing / Overgeneralization Checks
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

  // 2. Mind Reading Checks
  if (
    cleanText.includes("they think") ||
    cleanText.includes("annoyed") ||
    cleanText.includes("probably don't") ||
    cleanText.includes("want to")
  ) {
    if (!identifiedTraps.includes("Mind Reading")) {
      identifiedTraps.push("Mind Reading");
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

  // 4. Should Statements Checks
  if (
    cleanText.includes("should") ||
    cleanText.includes("must") ||
    cleanText.includes("ought to")
  ) {
    if (!identifiedTraps.includes("Should Statements")) {
      identifiedTraps.push("Should Statements");
    }
  }

  return identifiedTraps;
}
