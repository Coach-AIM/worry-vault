export interface QuoteItem {
  text: string;
  author: string;
  type: 'day' | 'evening';
}

export const perspectiveQuotes: QuoteItem[] = [
  { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr.", type: "day" },
  { text: "Small, gentle steps forward build massive long-term momentum.", author: "Anonymous", type: "day" },
  { text: "Am I reacting to what is actually happening, or what I'm afraid will happen?", author: "CBT Reframing", type: "day" },
  { text: "Quiet your mind, release today's weight. Rest is a crucial step in moving forward.", author: "Mindfulness", type: "evening" },
  { text: "You have done enough for today. Let go of the outcomes and protect your sleep.", author: "Resilience", type: "evening" }
];

export const getRandomQuote = (isEvening: boolean): QuoteItem => {
  const filtered = perspectiveQuotes.filter(q => q.type === (isEvening ? 'evening' : 'day'));
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
};
