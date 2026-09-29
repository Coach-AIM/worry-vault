import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import TasksTab from '@/app/tasks/page';
import Home from '@/app/page';

describe("Task Creation, Deletion & Today's Focus Syncing in localStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('creates task, saves to localStorage cache, and syncs pinning with Today Focus in localStorage', async () => {
    // 1. Render TasksTab
    const { unmount } = render(<TasksTab />);

    // Open Add Action Form
    const openFormBtn = screen.getByRole('button', { name: /\+ New Action/i });
    fireEvent.click(openFormBtn);

    // Enter title
    const titleInput = screen.getByPlaceholderText(/E.g., Prepare Presentation/i);
    fireEvent.change(titleInput, { target: { value: 'Complete 10 min grounding walk' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Add Action/i });
    fireEvent.click(submitBtn);

    // Verify task is rendered in list
    expect(await screen.findByText('Complete 10 min grounding walk')).toBeInTheDocument();

    // Verify persisted in momentum_actions localStorage
    const savedActions = JSON.parse(window.localStorage.getItem('momentum_actions') || '[]');
    expect(savedActions.length).toBeGreaterThanOrEqual(1);
    expect(savedActions[0].title).toBe('Complete 10 min grounding walk');

    // 2. Pin task to Today's Focus
    const focusBtn = screen.getByRole('button', { name: /☆ Focus/i });
    fireEvent.click(focusBtn);

    // Verify button changes to Focused
    expect(await screen.findByText(/⭐ Focused/i)).toBeInTheDocument();

    // Verify synced to momentum_today_focus_actions
    const focusActions = JSON.parse(window.localStorage.getItem('momentum_today_focus_actions') || '[]');
    expect(focusActions.some((a: any) => a.title === 'Complete 10 min grounding walk')).toBe(true);

    unmount();

    // 3. Render Home and verify pinned task appears in Today's Focus card
    render(<Home />);
    expect(screen.getByText('Complete 10 min grounding walk')).toBeInTheDocument();
  });

  it('deletes task, removes from localStorage cache, and automatically unpins from Today Focus', async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    const initialTask = {
      id: 999,
      title: 'Practice 4-7-8 Breathing',
      description: 'Breathing exercise',
      estimatedTime: '5 mins',
      emotionalIntensity: 'Low',
      dueDate: new Date().toISOString(),
      completed: 0,
      sortOrder: 0,
      parentId: null,
      recurrence: 'none'
    };

    window.localStorage.setItem('momentum_actions', JSON.stringify([initialTask]));
    window.localStorage.setItem('momentum_today_focus_actions', JSON.stringify([
      { id: '999', title: 'Practice 4-7-8 Breathing', completed: false }
    ]));

    render(<TasksTab />);

    expect(await screen.findByText('Practice 4-7-8 Breathing')).toBeInTheDocument();
    expect(screen.getByText(/⭐ Focused/i)).toBeInTheDocument();

    // Click Delete button on task
    const deleteBtn = screen.getByTitle('Delete action');
    fireEvent.click(deleteBtn);

    // Verify removed from task list
    await waitFor(() => {
      expect(screen.queryByText('Practice 4-7-8 Breathing')).not.toBeInTheDocument();
    });

    // Verify removed from momentum_actions
    const actions = JSON.parse(window.localStorage.getItem('momentum_actions') || '[]');
    expect(actions.find((a: any) => a.id === 999)).toBeUndefined();

    // Verify removed from momentum_today_focus_actions
    const focusActions = JSON.parse(window.localStorage.getItem('momentum_today_focus_actions') || '[]');
    expect(focusActions.find((a: any) => a.id === '999')).toBeUndefined();
  });
});
