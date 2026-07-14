export interface QuoteItem {
  text: string;
  author: string;
  type: 'day' | 'evening';
}

export const perspectiveQuotes: QuoteItem[] = [
  // DAYTIME PERSPECTIVES
  { text: "Am I reacting to what is actually happening, or what I'm afraid will happen?", author: "CBT Reframing", type: "day" },
  { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr.", type: "day" },
  { text: "Small, gentle steps forward build massive long-term momentum.", author: "Resilience Core", type: "day" },
  { text: "Thoughts are mental events, not absolute facts. Question the narrative your brain is spinning.", author: "Cognitive Science", type: "day" },
  { text: "Can I handle this next 5 minutes? Yes. Focus entirely on the immediate present interval.", author: "Grounding Anchor", type: "day" },
  { text: "Mistakes aren't proofs of incompetence; they are data points for adjustment.", author: "Growth Mindset", type: "day" },
  
  // EVENING PERSPECTIVES
  { text: "You have done enough for today. Let go of the outcomes and protect your sleep.", author: "Resilience Core", type: "evening" },
  { text: "Quiet your mind, release today's weight. Rest is a crucial step in moving forward.", author: "Mindfulness", type: "evening" },
  { text: "Tomorrow is a completely clean ledger. For now, your only job is to recover.", author: "CBT Restoration", type: "evening" },
  { text: "Anxious thoughts love an exhausted mind. Close the book on today; the problems can wait.", author: "Clinical Reminder", type: "evening" }
];

export const getRandomQuote = (isEvening: boolean): QuoteItem => {
  const filtered = perspectiveQuotes.filter(q => q.type === (isEvening ? 'evening' : 'day'));
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
};
