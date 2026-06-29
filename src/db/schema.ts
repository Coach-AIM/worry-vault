import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const journalEntries = sqliteTable('journal_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  entryText: text('entry_text').notNull(),
  insights: text('insights') // JSON stringified list of cognitive distortions
});

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  title: text('title').notNull(),
  estimatedTime: text('estimated_time'), // e.g., "15 mins"
  emotionalIntensity: text('emotional_intensity'), // "Low", "Medium", "High"
  dueDate: text('due_date'), // Formatted Date string
  completed: integer('completed').default(0).notNull(), // 0 = false, 1 = true
  sortOrder: integer('sort_order').default(0).notNull(),
  parentId: integer('parent_id'),
  recurrence: text('recurrence').default('none').notNull() // 'none', 'daily', 'weekly'
});

export const therapistContact = sqliteTable('therapist_contact', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes')
});

export const positiveThoughts = sqliteTable('positive_thoughts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  thoughtText: text('thought_text').notNull()
});
