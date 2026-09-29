import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/gemini/route';

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      };
    }),
    Type: {
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
      STRING: 'STRING',
      INTEGER: 'INTEGER'
    },
    Schema: {}
  };
});

describe('/api/gemini POST Route', () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test_api_key_123';
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
  });

  it('returns fallback JSON without 500 when GEMINI_API_KEY is missing or empty', async () => {
    delete process.env.GEMINI_API_KEY;

    const req = new Request('http://localhost/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'I feel overwhelmed with work', type: 'emotions' })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.fallback).toBe(true);
    expect(data.error).toBe('GEMINI_API_KEY_MISSING');
  });

  it('generates content successfully using gemini-2.0-flash model', async () => {
    const mockOutput = {
      emotions: { Anxious: 80, Overwhelmed: 70 },
      distortions: ['Catastrophizing'],
      reframed_thought: 'Take one step at a time',
      friend_test_reframe: 'Advice for friend',
      fact_checking_reframe: 'Fact checking analysis',
      perspective_reset_reframe: 'Perspective reset plan'
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockOutput)
    });

    const req = new Request('http://localhost/api/gemini', {
      method: 'POST',
      body: JSON.stringify({
        prompt: { situation: 'Busy week', automaticThought: 'I will fail' },
        type: 'journal'
      })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.result).toEqual(mockOutput);
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.0-flash'
    }));
  });

  it('gracefully catches exceptions and returns fallback response without throwing 500', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Rate limit exceeded / Network timeout'));

    const req = new Request('http://localhost/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test situation', type: 'emotions' })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.fallback).toBe(true);
    expect(data.error).toContain('Rate limit exceeded');
  });
});
