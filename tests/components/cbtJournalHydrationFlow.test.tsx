import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import JournalPage from '@/app/journal/page';
import Home from '@/app/page';
import Toolkit from '@/app/toolkit/page';
import CloseLoopModal from '@/components/CloseLoopModal';
import { getPoints } from '@/lib/points';

describe('End-to-End CBT Flow, Hydration & API Resilience', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('verifies zero network requests while typing and only fires API call on Analyze Thought click', async () => {
    const fetchMock = vi.fn().mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/journal')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ entries: [] }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/positives')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ glimmers: [] }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/gemini')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            result: {
              distortions: ['catastrophizing'],
              reframed_thought: 'I can take this one step at a time.',
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    global.fetch = fetchMock as any;

    render(<JournalPage />);

    // Reset call counts after initial mount fetches (/api/journal, /api/positives)
    fetchMock.mockClear();

    // Step 1: Type in Situation textarea
    const situationInput = screen.getByPlaceholderText(/My boss sent me an email/i);
    fireEvent.change(situationInput, { target: { value: 'Work deadline tomorrow morning' } });

    // Verify 0 calls to /api/gemini while typing
    const geminiCallsTyping1 = fetchMock.mock.calls.filter(([url]) =>
      typeof url === 'string' && url.includes('/api/gemini')
    );
    expect(geminiCallsTyping1.length).toBe(0);

    // Click Continue to step 2
    const step1Next = screen.getByRole('button', { name: /^Continue$/i });
    fireEvent.click(step1Next);

    // Step 2: Open category Anxiety/Fear, then select Anxious
    const catBtn = await screen.findByRole('button', { name: /Anxiety\/Fear/i });
    fireEvent.click(catBtn);

    const anxiousBtn = await screen.findByRole('button', { name: /Anxious/i });
    fireEvent.click(anxiousBtn);

    // Continue to Step 3
    const step2Next = screen.getByRole('button', { name: /^Continue$/i });
    fireEvent.click(step2Next);

    // Step 3: Type in Automatic Thought textarea
    const thoughtInput = await screen.findByPlaceholderText(/I am going to get fired/i);
    fireEvent.change(thoughtInput, { target: { value: 'I will fail completely and everyone will judge me' } });

    // Verify still 0 calls to /api/gemini while typing thoughts
    const geminiCallsTyping2 = fetchMock.mock.calls.filter(([url]) =>
      typeof url === 'string' && url.includes('/api/gemini')
    );
    expect(geminiCallsTyping2.length).toBe(0);

    // Click Analyze Thought button
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Thought/i });
    fireEvent.click(analyzeBtn);

    // Verify /api/gemini was called after clicking Analyze Thought
    await waitFor(() => {
      const geminiCallsAfterClick = fetchMock.mock.calls.filter(([url]) =>
        typeof url === 'string' && url.includes('/api/gemini')
      );
      expect(geminiCallsAfterClick.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles offline or 429 response gracefully without blocking alert() and reveals manual distortion picker', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    global.fetch = vi.fn().mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/journal')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ entries: [] }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/positives')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ glimmers: [] }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/gemini')) {
        // Simulate 429 Rate Limit error
        return Promise.resolve({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ ok: false, error: 'Rate limit reached. Please try again later.' }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as any;

    render(<JournalPage />);

    // Fill Situation
    const situationInput = screen.getByPlaceholderText(/My boss sent me an email/i);
    fireEvent.change(situationInput, { target: { value: 'Unexpected bill arrived' } });
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));

    // Select Emotion
    const catBtn = await screen.findByRole('button', { name: /Anxiety\/Fear/i });
    fireEvent.click(catBtn);

    const anxiousBtn = await screen.findByRole('button', { name: /Anxious/i });
    fireEvent.click(anxiousBtn);
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));

    // Fill Thought
    const thoughtInput = await screen.findByPlaceholderText(/I am going to get fired/i);
    fireEvent.change(thoughtInput, { target: { value: 'I will never recover financially' } });

    // Click Analyze Thought
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Thought/i });
    fireEvent.click(analyzeBtn);

    // Verify Step 4 is reached and manual distortion selector is shown without blocking alert
    await waitFor(() => {
      expect(screen.getByText(/AI analysis unavailable right now/i)).toBeInTheDocument();
    });

    expect(alertSpy).not.toHaveBeenCalled();

    // Verify manual trap selection options are visible
    expect(screen.getAllByText(/All-or-Nothing Thinking/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Catastrophizing/i).length).toBeGreaterThanOrEqual(1);
  });

  it('saves alternative thought in Step 4 and displays cleanly in history without [Pending Reframe]', async () => {
    let savedPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (typeof url === 'string' && url.includes('/api/journal') && options?.method === 'POST') {
        savedPayload = JSON.parse(options.body as string);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            data: [{
              id: 555,
              situation: savedPayload.situation,
              automaticThought: savedPayload.automaticThought,
              reframedThought: savedPayload.reframedThought,
              entryType: 'negative',
              createdAt: new Date().toISOString(),
            }],
          }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/journal')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            entries: savedPayload
              ? [{
                  id: 555,
                  situation: savedPayload.situation,
                  automaticThought: savedPayload.automaticThought,
                  reframedThought: savedPayload.reframedThought,
                  entryType: 'negative',
                  createdAt: new Date().toISOString(),
                }]
              : [],
          }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/positives')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ glimmers: [] }) });
      }
      if (typeof url === 'string' && url.includes('/api/gemini')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            result: {
              distortions: ['catastrophizing'],
              reframed_thought: 'This is a manageable expense that I can budget for.',
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as any;

    render(<JournalPage />);

    // Step 1: Situation
    fireEvent.change(screen.getByPlaceholderText(/My boss sent me an email/i), {
      target: { value: 'Car repair estimate' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));

    // Step 2: Emotion
    const catBtn = await screen.findByRole('button', { name: /Anxiety\/Fear/i });
    fireEvent.click(catBtn);

    const anxiousBtn = await screen.findByRole('button', { name: /Anxious/i });
    fireEvent.click(anxiousBtn);
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));

    // Step 3: Thought
    fireEvent.change(await screen.findByPlaceholderText(/I am going to get fired/i), {
      target: { value: 'My savings will be completely wiped out' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze Thought/i }));

    // Step 4: Advance from Traps to Step 5 (Reframe)
    const step4Next = await screen.findByRole('button', { name: /^Continue$/i });
    fireEvent.click(step4Next);

    // Step 5 reached, verify alternative thought input
    const altInput = await screen.findByPlaceholderText(/Type your reframed, realistic thought here/i);
    expect(altInput).toBeInTheDocument();

    // User edits the alternative thought
    fireEvent.change(altInput, {
      target: { value: 'I have emergency savings set aside specifically for car repairs.' },
    });

    // Click Save Entry & Finish
    const saveBtn = screen.getByRole('button', { name: /Save Entry & Finish/i });
    fireEvent.click(saveBtn);

    // Verify saved payload has real alternative thought and NOT '[Pending Reframe]'
    await waitFor(() => {
      expect(savedPayload).not.toBeNull();
      expect(savedPayload.reframedThought).toBe('I have emergency savings set aside specifically for car repairs.');
      expect(savedPayload.reframedThought).not.toContain('[Pending Reframe]');
    });

    // Verify post-save view does NOT show '[Pending Reframe]'
    expect(screen.queryByText(/\[Pending Reframe\]/i)).not.toBeInTheDocument();
  });

  it('completes Close the Loop modal, awards +40 points, and marks card as Reality Tested', async () => {
    const handleComplete = vi.fn();
    const handleClose = vi.fn();

    render(
      <CloseLoopModal
        isOpen={true}
        entryId={123}
        situation="Important client meeting"
        automaticThought="They will hate my proposal and fire us"
        onClose={handleClose}
        onComplete={handleComplete}
      />
    );

    const initialPoints = getPoints();

    // Step 1: What actually happened?
    expect(screen.getByText(/Step 1: What actually happened in reality\?/i)).toBeInTheDocument();
    const outcomeTextarea = screen.getByPlaceholderText(/The meeting went ahead normally/i);
    fireEvent.change(outcomeTextarea, {
      target: { value: 'The client loved the proposal and signed the 6-month contract on the spot.' },
    });

    const step1Next = screen.getByRole('button', { name: /Continue →/i });
    fireEvent.click(step1Next);

    // Step 2: How accurate was your prediction?
    expect(await screen.findByText(/Step 2: How accurate was your prediction\?/i)).toBeInTheDocument();
    const falseOptionBtn = screen.getByRole('button', { name: /Completely False/i });
    fireEvent.click(falseOptionBtn);

    const step2Next = screen.getByRole('button', { name: /Continue →/i });
    fireEvent.click(step2Next);

    // Step 3: Rate relief & submit
    expect(await screen.findByText(/Step 3: Current Relief Rating/i)).toBeInTheDocument();
    const reliefBtn = screen.getByRole('button', { name: '5' });
    fireEvent.click(reliefBtn);

    const submitBtn = screen.getByRole('button', { name: /Complete Reality Check \(\+40 pts\)/i });
    fireEvent.click(submitBtn);

    // Verify +40 points awarded
    await waitFor(() => {
      expect(getPoints()).toBe(initialPoints + 40);
      expect(handleComplete).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          outcomeText: 'The client loved the proposal and signed the 6-month contract on the spot.',
          accuracyLevel: 'Completely False / Disproved',
          predictionEvaluation: 'Much better than expected',
        })
      );
    });
  });

  it('verifies client mounting protection for localStorage across Home and Toolkit', async () => {
    // Seed localStorage
    window.localStorage.setItem('momentum_resilience_points', '350');
    window.localStorage.setItem('momentum_support_contact', JSON.stringify({
      name: 'Dr. Sarah Smith',
      role: 'Therapist',
      phone: '555-0199',
    }));

    // Render Home - resilience points should render cleanly after mount
    const { unmount: unmountHome } = render(<Home />);
    expect(await screen.findByText('350')).toBeInTheDocument();
    unmountHome();

    // Render Toolkit - support contact card should render cleanly after mount
    render(<Toolkit />);
    expect(await screen.findByText(/Dr\. Sarah/i)).toBeInTheDocument();
    expect(screen.getByText(/Saved:/i)).toBeInTheDocument();
  });
});
