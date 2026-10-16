export interface QuoteItem {
  quote: string;
  author: string;
  text?: string;
  type?: 'day' | 'evening';
}

export const perspectiveQuotes: QuoteItem[] = [
  {
    quote: "You have power over your mind - not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius"
  },
  {
    quote: "We suffer more often in imagination than in reality.",
    author: "Seneca"
  },
  {
    quote: "Men are disturbed not by things, but by the view which they take of them.",
    author: "Epictetus"
  },
  {
    quote: "Between stimulus and response there is a space. In that space is our power to choose our response.",
    author: "Viktor E. Frankl"
  },
  {
    quote: "I am not what happened to me, I am what I choose to become.",
    author: "Carl Jung"
  },
  {
    quote: "My life has been full of terrible misfortunes that for the most part never happened.",
    author: "Michel de Montaigne"
  },
  {
    quote: "The greatest weapon against stress is our ability to choose one thought over another.",
    author: "William James"
  },
  {
    quote: "Never let the future disturb you. You will meet it with the same weapons of reason which arm you against the present.",
    author: "Marcus Aurelius"
  },
  {
    quote: "True happiness is to enjoy the present, without anxious dependence upon the future.",
    author: "Seneca"
  },
  {
    quote: "There is only one way to happiness, and that is to cease worrying about things which are beyond the power of our will.",
    author: "Epictetus"
  },
  {
    quote: "Do you have the patience to wait until your mud settles and the water is clear?",
    author: "Lao Tzu"
  },
  {
    quote: "When we are no longer able to change a situation, we are challenged to change ourselves.",
    author: "Viktor E. Frankl"
  },
  {
    quote: "Today I escaped anxiety. Or no, I discarded it, because it was within me, in my own perceptions—not outside.",
    author: "Marcus Aurelius"
  },
  {
    quote: "A man who suffers before it is necessary, suffers more than is necessary.",
    author: "Seneca"
  },
  {
    quote: "Until you make the unconscious conscious, it will direct your life and you will call it fate.",
    author: "Carl Jung"
  },
  {
    quote: "Act as if what you do makes a difference. It does.",
    author: "William James"
  },
  {
    quote: "Don't seek for everything to happen as you wish it would, but rather wish that everything happens as it actually will.",
    author: "Epictetus"
  },
  {
    quote: "The soul becomes dyed with the color of its thoughts.",
    author: "Marcus Aurelius"
  },
  {
    quote: "He who fears he will suffer, already suffers because he fears.",
    author: "Michel de Montaigne"
  },
  {
    quote: "Care about what other people think and you will always be their prisoner.",
    author: "Lao Tzu"
  },
  {
    quote: "Everything can be taken from a man but the last of human freedoms: to choose one's attitude in any given set of circumstances.",
    author: "Viktor E. Frankl"
  },
  {
    quote: "It's not what happens to you, but how you react to it that matters.",
    author: "Epictetus"
  },
  {
    quote: "Confine yourself to the present.",
    author: "Marcus Aurelius"
  },
  {
    quote: "If you really want to escape the things that harass you, what you need is not to be in a different place but to be a different person.",
    author: "Seneca"
  },
  {
    quote: "The art of being wise is the art of knowing what to overlook.",
    author: "William James"
  },
  {
    quote: "There is no use running; to arrive in time you must just depart in good time.",
    author: "Michel de Montaigne"
  },
  {
    quote: "To a mind that is still, the whole universe surrenders.",
    author: "Zhuangzi"
  },
  {
    quote: "The happiness of your life depends upon the quality of your thoughts.",
    author: "Marcus Aurelius"
  },
  {
    quote: "Wild animals run from the dangers they actually see. We however are tormented both by what is past and what is to come.",
    author: "Seneca"
  },
  {
    quote: "Make the best use of what is in your power, and take the rest as it happens.",
    author: "Epictetus"
  },
  {
    quote: "Those who have a 'why' to live, can bear with almost any 'how'.",
    author: "Viktor E. Frankl"
  },
  {
    quote: "Who looks outside, dreams; who looks inside, awakes.",
    author: "Carl Jung"
  },
  {
    quote: "Begin to be now what you will be hereafter.",
    author: "William James"
  },
  {
    quote: "The greatest thing in the world is to know how to belong to oneself.",
    author: "Michel de Montaigne"
  },
  {
    quote: "Nature does not hurry, yet everything is accomplished.",
    author: "Lao Tzu"
  },
  {
    quote: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.",
    author: "Marcus Aurelius"
  },
  {
    quote: "Begin at once to live, and count each separate day as a separate life.",
    author: "Seneca"
  },
  {
    quote: "Small-minded people blame others. Average people blame themselves. The wise see all blame as foolishness.",
    author: "Epictetus"
  },
  {
    quote: "Even a happy life cannot be without a measure of darkness, and the word happy would lose its meaning were it not balanced by sadness.",
    author: "Carl Jung"
  },
  {
    quote: "If you can change your mind, you can change your life.",
    author: "William James"
  },
  {
    quote: "Emotion, which is suffering, ceases to be suffering as soon as we form a clear and precise picture of it.",
    author: "Baruch Spinoza"
  },
  {
    quote: "Not being able to govern events, I govern myself.",
    author: "Michel de Montaigne"
  },
  {
    quote: "How much more grievous are the consequences of anger than the causes of it.",
    author: "Marcus Aurelius"
  },
  {
    quote: "Difficulty shows what men are.",
    author: "Epictetus"
  },
  {
    quote: "Waste no more time arguing about what a good man should be. Be one.",
    author: "Marcus Aurelius"
  },
  {
    quote: "Nothing is a better proof of a well-ordered mind than a man's ability to stop where he is and pass some time in his own company.",
    author: "Seneca"
  },
  {
    quote: "First say to yourself what you would be; and then do what you have to do.",
    author: "Epictetus"
  }
];

export const getRandomQuote = (isEvening?: boolean, currentQuoteText?: string): QuoteItem => {
  const pool = currentQuoteText
    ? perspectiveQuotes.filter((q) => q.quote !== currentQuoteText && q.text !== currentQuoteText)
    : perspectiveQuotes;
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex] || perspectiveQuotes[0];
  return {
    ...selected,
    text: selected.text || selected.quote
  };
};

export const getRandomPerspectiveQuote = (currentQuoteText?: string): QuoteItem => {
  return getRandomQuote(false, currentQuoteText);
};