import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DecisionAssistantModal from '@/components/DecisionAssistantModal';

describe('Decision Assistant Pencil Inline Editor & Score Accuracy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('updates option scores accurately in real-time when editing factor weight and type via pencil button', () => {
    const handleClose = vi.fn();
    render(<DecisionAssistantModal isOpen={true} onClose={handleClose} />);

    // Step 1: Input Dilemma and go to step 2
    const dilemmaInput = screen.getByPlaceholderText(/Should I accept the new job offer/i);
    fireEvent.change(dilemmaInput, { target: { value: 'Relocate to New York vs Stay in Austin' } });
    
    const continueBtn = screen.getByRole('button', { name: /Continue to Options & Pros\/Cons/i });
    fireEvent.click(continueBtn);

    // Initial score for Option A should be 0 (Values: Unsure (0), Life Improvement: Neutral (0), no factors)
    expect(screen.getByText(/Net Calculated Score for Option A:/i)).toBeInTheDocument();
    expect(screen.getByText('0 pts')).toBeInTheDocument();

    // 1. Add a Pro Factor with default weight 3: "Higher career velocity"
    const factorInput = screen.getByPlaceholderText(/Higher growth opportunities/i);
    fireEvent.change(factorInput, { target: { value: 'Higher career velocity' } });

    const addProBtn = screen.getByRole('button', { name: /\+ Pro \(\+3\)/i });
    fireEvent.click(addProBtn);

    // Score should now be +3 pts
    expect(screen.getByText('+3 pts')).toBeInTheDocument();
    expect(screen.getByText('Higher career velocity')).toBeInTheDocument();

    // 2. Click the ✏️ Pencil button on the factor
    const pencilBtn = screen.getByRole('button', { name: /Edit factor weight and type/i });
    fireEvent.click(pencilBtn);

    // Confirm inline popover opened
    expect(screen.getByText(/Edit Factor:/i)).toBeInTheDocument();
    expect(screen.getByText(/Recalibrates score instantly/i)).toBeInTheDocument();

    // 3. Switch factor from Pro (+) to Con (-)
    const conToggleBtn = screen.getByRole('button', { name: /👎 Con \(-\)/i });
    fireEvent.click(conToggleBtn);

    // Score should now immediately drop from +3 to -3 pts
    expect(screen.getByText('-3 pts')).toBeInTheDocument();

    // 4. Increase weight from 3 to 5 in the inline editor
    const weight5Buttons = screen.getAllByRole('button', { name: '5' });
    const weight5Btn = weight5Buttons[weight5Buttons.length - 1];
    fireEvent.click(weight5Btn);

    // Score should now immediately be -5 pts
    expect(screen.getByText('-5 pts')).toBeInTheDocument();

    // 5. Switch back to Pro (+) with weight 5
    const proToggleBtn = screen.getByRole('button', { name: /👍 Pro \(\+\)/i });
    fireEvent.click(proToggleBtn);

    // Score should now immediately be +5 pts
    expect(screen.getByText('+5 pts')).toBeInTheDocument();

    // 6. Close the pencil editor
    const doneBtn = screen.getByRole('button', { name: /✓ Done/i });
    fireEvent.click(doneBtn);

    expect(screen.queryByText(/Recalibrates score instantly/i)).not.toBeInTheDocument();

    // 7. Advance through Option B to Step 3 (Verdict) and confirm the +5 score persists in summary
    const nextOptBtn = screen.getByRole('button', { name: /Next Option/i });
    fireEvent.click(nextOptBtn);

    const verdictBtn = screen.getByRole('button', { name: /Calculate Summary & Verdict/i });
    fireEvent.click(verdictBtn);

    expect(screen.getByText(/Decision Analysis Verdict/i)).toBeInTheDocument();
    expect(screen.getByText('+5 pts')).toBeInTheDocument();
  });
});
