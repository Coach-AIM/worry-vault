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
    "Stressed", "Restless", "Dread", "Apprehensive"
  ],
  "Guilt/Shame": [
    "Embarrassed", "Worthless", "Remorseful", "Humiliated", "Regretful", 
    "Apologetic", "Stupid", "Burdened"
  ],
  "Joy/Relief": [
    "Happy", "Proud", "Optimistic", "Calm", "Grateful", "Content", 
    "Relieved", "Hopeful", "Excited", "Peaceful"
  ],
  "Surprise/Confusion": [
    "Confused", "Stunned", "Lost", "Shocked", "Uncertain", "Perplexed"
  ]
};

export const PRIMARY_EMOTIONS = Object.keys(EMOTION_WHEEL);
