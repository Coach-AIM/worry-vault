import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 1. Refactored Journal Entries with Native Positive CBT Support
export const journalEntries = sqliteTable("journal_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  // Differentiates traditional CBT loops from Positive/Success tracking
  entryType: text("entry_type", { enum: ["negative", "positive"] })
    .notNull()
    .default("negative"),
  
  // Core Context Data
  situation: text("situation").notNull(),
  
  // Stores strong key-value pairs: e.g., '{"Stressed": 88, "Proud": 40}'
  emotionsJson: text("emotions_json").notNull(),
  
  // Nullable fields: Empty when entryType === 'positive'
  automaticThought: text("automatic_thought"),
  
  // Stores a stringified JSON array: e.g., '["Mind Reading", "Should Statements"]'
  distortionsJson: text("distortions_json"),
  
  // Multi-purpose field: Acts as 'Reframed Thought' or 'Core Strength / Savoring Anchor'
  reframedThought: text("reframed_thought").notNull(),
});

// 2. Enhanced Positive Thoughts / Gratitude Logs
export const positiveThoughts = sqliteTable("positive_thoughts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  thoughtText: text("thought_text").notNull(),
  // Enhances categorization rules for frontend card-rendering / carousels
  category: text("category", { 
    enum: ["Gratitude", "Strength Validation", "Exception to Problem", "General"] 
  }).default("General").notNull(),
});

// 3. Keep existing Tasks and Therapist layouts intact
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  estimatedTime: text("estimated_time"),
  emotionalIntensity: text("emotional_intensity"),
  dueDate: text("due_date"),
  completed: integer("completed").default(0).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  parentId: integer("parent_id"),
  recurrence: text("recurrence").default("none").notNull(),
});

export const therapistContact = sqliteTable("therapist_contact", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
});
