export const EMOTION_WHEEL: Record<string, string[]> = {
  "Sadness": [
    "Depressed", "Lonely", "Hopeless", "Disappointed", "Grieving", "Hurt", 
    "Vulnerable", "Empty", "Isolated", "Sorrowful"
  ],
  "Anger": [
    "Frustrated", "Irritated", "Furious", "Resentful", "Jealous", "Betrayed", 
    "Bitter", "Mad", "Annoyed", "Outraged"
  ],
  "Anxiety/Fear": [
    "Worried", "Nervous", "Panicked", "Overwhelmed", "Insecure", "Terrified", 
    "Stressed", "Restless", "Dread", "Apprehensive", "Anxious"
  ],
  "Guilt/Shame": [
    "Embarrassed", "Worthless", "Remorseful", "Humiliated", "Regretful", 
    "Apologetic", "Stupid", "Burdened"
  ],
  "High-Activation Joy": [
    "Excited", "Inspired", "Elated", "Happy", "Proud", "Optimistic", "Energized"
  ],
  "Low-Activation Joy": [
    "Content", "Peaceful", "Serene", "Calm", "Grateful", "Relieved", "Hopeful"
  ],
  "Surprise/Confusion": [
    "Confused", "Stunned", "Lost", "Shocked", "Uncertain", "Perplexed"
  ]
};

export const PRIMARY_EMOTIONS = Object.keys(EMOTION_WHEEL);
