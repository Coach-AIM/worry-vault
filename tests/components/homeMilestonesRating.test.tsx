import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Home from '@/app/page';

describe('Home 0-10 Rating Scale & Resilience Milestones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('completes habit, presents 0-10 pips, selects 7, persists Completed (Rating: 7/10), and re-edits', async () => {
    render(<Home />);

    // 1. Verify default habit Meditate is present
    expect(screen.getByText('Meditate')).toBeInTheDocument();

    // 2. Check Meditate
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    // 3. Verify 0-10 pips are rendered
    for (let i = 0; i <= 10; i++) {
      expect(screen.getByRole('button', { name: new RegExp(`^${i}$`) })).toBeInTheDocument();
    }

    // Verify anchor labels
    expect(screen.getByText(/0: Drained \/ Hard/i)).toBeInTheDocument();
    expect(screen.getByText(/5: Neutral/i)).toBeInTheDocument();
    expect(screen.getByText(/10: Relieved \/ Accomplished/i)).toBeInTheDocument();

    // 4. Select rating 7
    const pip7 = screen.getByRole('button', { name: /^7$/ });
    fireEvent.click(pip7);

    // 5. Verify badge Completed (Rating: 7/10) is displayed
    expect(await screen.findByText('Completed (Rating: 7/10)')).toBeInTheDocument();

    // Verify saved to localStorage
    const saved = JSON.parse(window.localStorage.getItem('momentum_today_focus_actions') || '[]');
    const meditate = saved.find((a: any) => a.id === 'meditate');
    expect(meditate).toBeDefined();
    expect(meditate.completed).toBe(true);
    expect(meditate.moodRating).toBe(7);

    // 6. Click badge to re-edit
    const badgeBtn = screen.getByText('Completed (Rating: 7/10)');
    fireEvent.click(badgeBtn);

    // Popover opens in re-edit mode
    expect(screen.getByText(/Update rating for:/i)).toBeInTheDocument();
    expect(screen.getByText(/How would you rate this outcome\?/i)).toBeInTheDocument();

    // Change rating to 10
    const pip10 = screen.getByRole('button', { name: /^10$/ });
    fireEvent.click(pip10);

    // Verify updated badge
    expect(await screen.findByText('Completed (Rating: 10/10)')).toBeInTheDocument();
    const updated = JSON.parse(window.localStorage.getItem('momentum_today_focus_actions') || '[]');
    expect(updated.find((a: any) => a.id === 'meditate').moodRating).toBe(10);
  });

  it('renders Resilience Milestones card, shows tiers, and opens Insight Summary modal for unlocked tier', async () => {
    // Seed points and closed loops in localStorage
    window.localStorage.setItem('momentum_resilience_points', '125');
    window.localStorage.setItem('momentum_journal_entries', JSON.stringify([
      {
        id: 1,
        situation: 'Work presentation anxiety',
        cognitiveDistortions: ['Catastrophizing', 'Fortune Telling'],
        loopOutcome: 'Presentation went smoothly and boss praised the work.',
        loopAccuracy: 'Completely False / Disproved',
        predictionEvaluation: 'Much better than expected',
        loopCompletedAt: new Date().toISOString(),
      },
      {
        id: 2,
        situation: 'Friend delayed text reply',
        cognitiveDistortions: ['Mind Reading'],
        loopOutcome: 'Friend was in surgery and replied warmly later.',
        loopAccuracy: 'Completely False / Disproved',
        predictionEvaluation: 'Much better than expected',
        loopCompletedAt: new Date().toISOString(),
      }
    ]));

    render(<Home />);

    // 1. Verify Resilience Momentum Card is rendered
    expect(screen.getByText('Resilience Momentum')).toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument(); // 125 pts
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 closed loops
    expect(screen.getByText('100%')).toBeInTheDocument(); // 100% fears disproved

    // 2. Verify milestone tiers
    expect(screen.getByText('Awareness Anchor')).toBeInTheDocument();
    expect(screen.getByText('Cognitive Challenger')).toBeInTheDocument();
    expect(screen.getByText('Resilience Master')).toBeInTheDocument();

    // 3. Since 125 >= 100 pts, Awareness Anchor is unlocked
    expect(screen.getByText('✓ Unlocked')).toBeInTheDocument();

    // 4. Open Insight Summary
    const insightBtn = screen.getByRole('button', { name: /Insight Summary/i });
    fireEvent.click(insightBtn);

    // Verify modal is displayed
    expect(screen.getByText(/Milestone Unlocked \(100\+ Pts\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Empirical Cognitive Proof/i)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument(); // 3 distortions challenged total
    expect(screen.getByText(/CBT Clinical Takeaway/i)).toBeInTheDocument();

    // 5. Close modal
    const closeBtn = screen.getByRole('button', { name: /Close Summary/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Milestone Unlocked \(100\+ Pts\)/i)).not.toBeInTheDocument();
    });
  });
});
