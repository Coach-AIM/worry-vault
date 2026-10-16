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
      "not want to chill",
      "not wanted to chill",
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

export const MIND_READING_REGEX =
  /(\b(he|she|they|everyone|everybody|someone|nobody)\b\s+(must|probably|must\s+not\s+(?:of|have)?|didn'?t|doesn'?t|does\s+not)\s+(want|care|like|think|feel|hate|dislike|chill))/i;

export const INTERPERSONAL_ASSUMPTION_PATTERNS = [
  MIND_READING_REGEX,
  /\b(he|she|they)\b\s+must\s+not\s+(?:of|have)?/i,
  /\b(?:he|she|they|everyone|everybody|people|someone|nobody)\s+(?:must\s+)?(?:not\s+like|hate|dislike|think|be\s+mad|be\s+angry|be\s+annoyed)\b/i,
  /\bmust\s+(?:not\s+like|hate|dislike|think|be\s+mad|be\s+angry|be\s+annoyed|despise)\b/i,
  /\b(?:he|she|they|everyone|everybody)\s+must\b/i,
  /\b(?:not\s+like\s+me|doesn'?t\s+like\s+me|does\s+not\s+like\s+me|must\s+hate\s+me|mad\s+at\s+me|angry\s+at\s+me)\b/i,
];

export function isInterpersonalAssumption(text: string): boolean {
  const clean = text.toLowerCase();
  return INTERPERSONAL_ASSUMPTION_PATTERNS.some((pattern) => pattern.test(clean));
}

export function isMindReadingDetected(text: string): boolean {
  const lowerText = text.toLowerCase();
  if (isInterpersonalAssumption(lowerText)) return true;
  const mrDistortion = DISTORTIONS.find((d) => d.id === "mind-reading");
  if (mrDistortion) {
    return mrDistortion.keywords.some((k) => lowerText.includes(k));
  }
  return false;
}

export function findDistortions(text: string): DistortionType[] {
  const lowerText = text.toLowerCase();
  const found: DistortionType[] = [];
  const interpersonal = isInterpersonalAssumption(lowerText);
  const mindReadingMatch = isMindReadingDetected(lowerText);

  for (const distortion of DISTORTIONS) {
    if (distortion.id === "mind-reading") {
      if (mindReadingMatch) {
        found.push(distortion);
      }
    } else if (distortion.id === "should-statements") {
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
  if (isMindReadingDetected(cleanText)) {
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

export interface ContextAwareReframeParams {
  thought: string;
  situation: string;
  lens: "friend" | "fact" | "reset" | "freeform";
  distortions: string[];
}

export function getContextAwareReframe({
  thought,
  situation,
  lens,
  distortions,
}: ContextAwareReframeParams): string {
  const fullText = `${situation} ${thought}`.toLowerCase();
  const normDistortions = distortions.map((d) => d.toLowerCase().replace(/[^a-z]/g, ""));
  const hasMindReading = normDistortions.some((d) => d.includes("mindreading"));
  const hasCatastrophizing = normDistortions.some((d) => d.includes("catastroph"));
  const hasAllOrNothing = normDistortions.some((d) => d.includes("allornothing"));
  const hasShould = normDistortions.some((d) => d.includes("should"));
  const hasEmotional = normDistortions.some((d) => d.includes("emotional"));
  const hasOvergeneralization = normDistortions.some((d) => d.includes("overgeneral"));

  // Theme A: Competence / Failure / Family
  const isCompetenceOrFamily =
    fullText.includes("screw up") ||
    fullText.includes("screwed up") ||
    fullText.includes("failure") ||
    fullText.includes("fail") ||
    fullText.includes("mess up") ||
    fullText.includes("messed up") ||
    fullText.includes("family") ||
    fullText.includes("parents") ||
    fullText.includes("work") ||
    fullText.includes("job") ||
    fullText.includes("boss") ||
    fullText.includes("career");

  // Theme B: Communication / Social Delay / Rejection
  const isCommunicationDelay =
    fullText.includes("didn't text") ||
    fullText.includes("did not text") ||
    fullText.includes("didn't message") ||
    fullText.includes("did not message") ||
    fullText.includes("didn't reply") ||
    fullText.includes("did not reply") ||
    fullText.includes("left on read") ||
    fullText.includes("no reply") ||
    fullText.includes("no response") ||
    fullText.includes("ghost") ||
    fullText.includes("chill") ||
    fullText.includes("text") ||
    fullText.includes("message");

  if (lens === "friend") {
    if (hasMindReading) {
      if (isCompetenceOrFamily) {
        return "If a close friend told me their family viewed them as a screw up, I'd remind them that individual mistakes don't define their identity or worth, and people's reactions rarely mean they see us as a failure.";
      }
      if (isCommunicationDelay) {
        return "If a close friend shared this worry with me, I'd remind them: You cannot read their mind. People get busy, tired, or caught up in their own worlds, and silence or delay is rarely about you.";
      }
      return "If a close friend worried that others were thinking negatively of them, I'd remind them that we cannot assume another person's inner monologue without direct confirmation.";
    }
    if (hasCatastrophizing) {
      return "I'd tell a friend: Take a deep breath. You are treating a worst-case worry as an absolute certainty, but you have handled difficult days before and you will handle this too.";
    }
    if (hasAllOrNothing) {
      return "I'd tell a friend: Nothing is all-or-nothing. Even if things didn't go flawlessly, your effort still counts and there is plenty of workable middle ground.";
    }
    if (hasShould) {
      return "I would tell a friend: Release the rigid pressure. You're holding yourself to unrealistic standards; give yourself permission to be human.";
    }
    if (hasEmotional) {
      return "I'd tell a friend: Just because you feel intense distress doesn't mean the situation is truly hopeless. Feelings are valid signals, not objective verdicts.";
    }
    if (hasOvergeneralization) {
      return "I'd tell a friend: This was one isolated event, not a forever pattern. Don't let one hard moment eclipse everything else.";
    }
    return "If a close friend were facing this, I'd offer them compassion: This is one moment in time, not a definition of who you are or what you're capable of.";
  }

  if (lens === "fact") {
    if (hasMindReading) {
      if (isCompetenceOrFamily) {
        return "What concrete facts prove they see me as a screw up versus my own internal fear of falling short? One difficult situation is not proof of total failure.";
      }
      if (isCommunicationDelay) {
        return "Objective facts: I only have observable behavior, not proof of their internal thoughts. Past positive interactions and ordinary human distractions contradict the idea that they dislike me.";
      }
      return "Objective facts: What concrete evidence do I have of their thoughts versus what I am guessing? My assumptions are hypotheses, not verified facts.";
    }
    if (hasCatastrophizing) {
      return "Objective facts: The feared worst-case scenario is an anxiety prediction, not reality. Concrete past experience shows that most imagined emergencies turn out to be completely manageable.";
    }
    if (hasAllOrNothing) {
      return "Objective facts: A single flaw or mixed outcome does not equal total failure. There are concrete elements that went well alongside areas for growth.";
    }
    if (hasShould) {
      return "Objective facts: Things often deviate from how we wish they would be. Reality doesn't follow rigid demands, and adaptation is more productive than self-criticism.";
    }
    if (hasEmotional) {
      return "Objective facts: Emotional intensity fluctuates based on stress, sleep, and adrenaline, not because external reality has collapsed.";
    }
    if (hasOvergeneralization) {
      return "Objective facts: There have been times when things turned out fine or even exceeded expectations; one setback does not create an unbroken chain of defeat.";
    }
    return "Objective facts: Strong emotions make worries feel true, but looking at concrete evidence, the actual situation is far more neutral than my automatic thought assumed.";
  }

  if (lens === "reset") {
    if (hasMindReading) {
      if (isCompetenceOrFamily) {
        return "Even if someone in my family is currently disappointed or critical, I can handle their disapproval without letting it define who I am.";
      }
      if (isCommunicationDelay) {
        return "Worst-case reset: Even if they are temporarily upset, I can communicate openly to clarify things, and my self-worth is not dependent on immediate external validation.";
      }
      return "Worst-case reset: Even if someone is forming a critical opinion, I cannot control everyone's thoughts, and I can stay grounded in my own values.";
    }
    if (hasCatastrophizing) {
      return "Worst-case reset: If the worst-case scenario actually happened, I would step back, break down the problem into single actionable steps, and lean on my coping tools.";
    }
    if (hasAllOrNothing) {
      return "Worst-case reset: Even if this effort falls short of my hopes, it is valuable learning data that will make my next attempt stronger.";
    }
    if (hasShould) {
      return "Worst-case reset: Even if things don't go according to my ideal timeline, I will accept the delay and calmly navigate what is in my control.";
    }
    if (hasEmotional) {
      return "Worst-case reset: Even when my emotions feel overwhelming, I know the physical surge will crest and subside within 20 minutes if I breathe and stay grounded.";
    }
    return "Worst-case reset: Even in the toughest outcome, I have the resilience, resourcefulness, and support systems to work through it.";
  }

  // freeform
  if (hasMindReading) {
    if (isCompetenceOrFamily) {
      return "One mistake or difficult interaction does not define my worth or future. I can separate other people's reactions from my core identity.";
    }
    if (isCommunicationDelay) {
      return "Silence or delayed communication is usually about the other person's schedule and energy, not their opinion of me.";
    }
    return "I choose not to jump to conclusions about what others think. I will focus on my own well-being and let them speak for themselves.";
  }
  if (hasCatastrophizing) {
    return "Anxiety turns possibilities into catastrophes. In reality, this situation is manageable and I can handle it calmly.";
  }
  if (hasAllOrNothing) {
    return "Growth happens in gray areas. Doing something imperfectly is infinitely better than giving up completely.";
  }
  if (hasShould) {
    return "Preferences are healthier than rigid rules. I will do my best without demanding perfection from myself or others.";
  }
  return "My automatic thoughts are hypotheses, not proven truths. A more grounded perspective is that I am doing my best and can take things one step at a time.";
}
