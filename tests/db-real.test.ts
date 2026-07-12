import { describe, it, expect } from 'vitest';
import { db } from '@/db/index';
import { journalEntries } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Real DB integration test', () => {
  it('inserts and deletes a row from local.db', async () => {
    const inserted = await db.insert(journalEntries).values({
      entryType: 'negative',
      situation: 'QA Audit Test',
      emotionsJson: JSON.stringify([{ name: 'Anxious', weight: 50 }]),
      automaticThought: 'Testing database write',
      distortionsJson: JSON.stringify(['all-or-nothing']),
      reframedThought: 'Reality check works',
      userId: 'qa_audit_test_user'
    }).returning();

    expect(inserted.length).toBe(1);
    expect(inserted[0].situation).toBe('QA Audit Test');
    
    // Clean up
    await db.delete(journalEntries).where(eq(journalEntries.userId, 'qa_audit_test_user'));
  });
});
