import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '@/app/api/journal/[id]/route';
import { getServerSession } from 'next-auth/next';
import { journalEntries } from '@/db/schema';

// Setup fluent mocks for Drizzle
const mockReturningFn = vi.fn();
const mockWhereFn = vi.fn().mockImplementation(() => ({
  returning: mockReturningFn
}));
const mockSetFn = vi.fn().mockImplementation(() => ({
  where: mockWhereFn
}));
const mockUpdateFn = vi.fn().mockImplementation(() => ({
  set: mockSetFn
}));

const mockWhereSelectFn = vi.fn();
const mockFromFn = vi.fn().mockImplementation(() => ({
  where: mockWhereSelectFn
}));
const mockSelectFn = vi.fn().mockImplementation(() => ({
  from: mockFromFn
}));

vi.mock('@/db/index', () => {
  return {
    db: {
      update: (table: any) => mockUpdateFn(table),
      select: () => mockSelectFn()
    }
  };
});

describe('/api/journal/[id] PATCH Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user_coach_1', name: 'Coach' }
    });
  });

  it('should return 401 if user is unauthorized', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/journal/123', {
      method: 'PATCH',
      body: JSON.stringify({ outcomeText: 'Test' })
    });
    const response = await PATCH(req, { params: Promise.resolve({ id: '123' }) });
    expect(response.status).toBe(401);
  });

  it('should return 400 if entry ID is invalid', async () => {
    const req = new Request('http://localhost/api/journal/abc', {
      method: 'PATCH',
      body: JSON.stringify({ outcomeText: 'Test' })
    });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(400);
  });

  it('should return 404 if entry is not found or does not belong to the user', async () => {
    mockWhereSelectFn.mockResolvedValueOnce([]); // No records found

    const req = new Request('http://localhost/api/journal/123', {
      method: 'PATCH',
      body: JSON.stringify({ outcomeText: 'Test' })
    });
    const response = await PATCH(req, { params: Promise.resolve({ id: '123' }) });
    expect(response.status).toBe(404);
  });

  it('should successfully update and return the updated journal entry', async () => {
    const existingEntry = [{ id: 123, situation: 'Stressful meeting', userId: 'user_coach_1' }];
    mockWhereSelectFn.mockResolvedValueOnce(existingEntry);

    const updatedEntry = {
      id: 123,
      situation: 'Stressful meeting',
      userId: 'user_coach_1',
      outcomeText: 'It went well',
      lessonsLearned: 'Meetings are manageable',
      predictionEvaluation: 'Much better than expected'
    };
    mockReturningFn.mockResolvedValueOnce([updatedEntry]);

    const req = new Request('http://localhost/api/journal/123', {
      method: 'PATCH',
      body: JSON.stringify({
        outcomeText: 'It went well',
        lessonsLearned: 'Meetings are manageable',
        predictionEvaluation: 'Much better than expected'
      })
    });
    const response = await PATCH(req, { params: Promise.resolve({ id: '123' }) });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(updatedEntry);

    expect(mockUpdateFn).toHaveBeenCalledWith(journalEntries);
    expect(mockSetFn).toHaveBeenCalledWith(expect.objectContaining({
      outcomeText: 'It went well',
      lessonsLearned: 'Meetings are manageable',
      predictionEvaluation: 'Much better than expected'
    }));
  });
});
