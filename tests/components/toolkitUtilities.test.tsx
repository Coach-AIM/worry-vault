import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Toolkit from '@/app/toolkit/page';
import DecisionAssistantModal from '@/components/DecisionAssistantModal';
import SupportContactModal from '@/components/SupportContactModal';
import TherapyExportModal from '@/components/TherapyExportModal';
import * as storage from '@/utils/storage';

describe('Toolkit Page & 4 Utility Actions Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders all 4 utility cards on the Toolkit page', () => {
    render(<Toolkit />);

    expect(screen.getByText('🧠 Decision Assistant')).toBeInTheDocument();
    expect(screen.getByText('📞 My Support Contact')).toBeInTheDocument();
    expect(screen.getByText('📄 Therapy Integration')).toBeInTheDocument();
    expect(screen.getByText('🔒 Secure Vault Backup')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Open Assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Add Support Contact/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Week to PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Encrypted Backup/i })).toBeInTheDocument();
  });

  /* -------------------------------------------------------------
     A. DECISION ASSISTANT MODAL TESTS
  ------------------------------------------------------------- */
  describe('A. Decision Assistant Modal', () => {
    it('opens modal, inputs dilemma, steps through pros/cons and saves decision note to localStorage', async () => {
      render(<Toolkit />);

      // 1. Click Open Assistant button
      const openBtn = screen.getByRole('button', { name: /Open Assistant/i });
      fireEvent.click(openBtn);

      // Verify modal is open and body scroll is locked
      expect(screen.getByText('Decision Assistant')).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden');

      // 2. Step 1: Input dilemma
      const textarea = screen.getByPlaceholderText(/Should I accept the new job offer/i);
      fireEvent.change(textarea, { target: { value: 'Accept new engineering job vs Stay in current team' } });

      const continueBtn = screen.getByRole('button', { name: /Continue to Options & Pros\/Cons/i });
      fireEvent.click(continueBtn);

      // 3. Step 2: Weight pros/cons & values
      expect(screen.getByText('Accept new engineering job vs Stay in current team')).toBeInTheDocument();
      
      // Select Core Values = Yes (+2) for Option A
      const yesBtn = screen.getByRole('button', { name: /Yes \(\+2\)/i });
      fireEvent.click(yesBtn);

      // Add a Pro Factor to Option A
      const factorInput = screen.getByPlaceholderText(/Higher growth opportunities/i);
      fireEvent.change(factorInput, { target: { value: '30% salary increase and mentorship' } });
      const addFactorBtn = screen.getByRole('button', { name: /\+ Pro/i });
      fireEvent.click(addFactorBtn);

      expect(screen.getByText('30% salary increase and mentorship')).toBeInTheDocument();

      // Proceed through Option B to Step 3 (Verdict)
      const nextOptionBtn = screen.getByRole('button', { name: /Next Option/i });
      fireEvent.click(nextOptionBtn);

      const verdictBtn = screen.getByRole('button', { name: /Calculate Summary & Verdict/i });
      fireEvent.click(verdictBtn);

      // 4. Step 3: Verdict card & save decision note
      expect(screen.getByText(/Decision Analysis Verdict/i)).toBeInTheDocument();

      const noteArea = screen.getByPlaceholderText(/Choosing Option A because|Taking Option A because/i);
      fireEvent.change(noteArea, { target: { value: 'Will accept offer on Monday after talking with family.' } });

      const saveNoteBtn = screen.getByRole('button', { name: /Save Decision Note/i });
      fireEvent.click(saveNoteBtn);

      // Verify success message appears
      expect(await screen.findByText(/Decision note saved to your local records!/i)).toBeInTheDocument();

      // Verify saved in localStorage
      const saved = storage.safeGetJSON<any[]>('momentum_decisions', []);
      expect(saved.length).toBe(1);
      expect(saved[0].dilemma).toBe('Accept new engineering job vs Stay in current team');
      expect(saved[0].decisionNote).toBe('Will accept offer on Monday after talking with family.');

      // Close modal
      const closeBtn = screen.getByRole('button', { name: /Done & Close/i });
      fireEvent.click(closeBtn);
      expect(document.body.style.overflow).toBe('');
    });

    it('closes on Escape key press and backdrop click', () => {
      const handleClose = vi.fn();
      const { rerender } = render(<DecisionAssistantModal isOpen={true} onClose={handleClose} />);

      // Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Backdrop click
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);
      expect(handleClose).toHaveBeenCalledTimes(2);

      rerender(<DecisionAssistantModal isOpen={false} onClose={handleClose} />);
      expect(screen.queryByText('Decision Assistant')).not.toBeInTheDocument();
    });
  });

  /* -------------------------------------------------------------
     B. SUPPORT CONTACT MODAL & QUICK-DIALER TESTS
  ------------------------------------------------------------- */
  describe('B. Support Contact Quick-Dialer', () => {
    it('saves a support contact, updates dynamic card state to Call [Name] + Edit button', async () => {
      render(<Toolkit />);

      // Click + Add Support Contact
      const addBtn = screen.getByRole('button', { name: /\+ Add Support Contact/i });
      fireEvent.click(addBtn);

      // Fill in contact modal
      expect(screen.getByText('Add Support Contact')).toBeInTheDocument();
      const nameInput = screen.getByPlaceholderText(/Dr. Sarah Jenkins or Crisis Helpline/i);
      const phoneInput = screen.getByPlaceholderText(/988 or \(555\) 234-5678/i);

      fireEvent.change(nameInput, { target: { value: 'Dr. Sarah Jenkins' } });
      fireEvent.change(phoneInput, { target: { value: '(555) 987-6543' } });

      const submitBtn = screen.getByRole('button', { name: /Save Support Contact/i });
      fireEvent.click(submitBtn);

      // Card updates dynamically
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Call Dr./i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Edit Support Contact/i })).toBeInTheDocument();
      });

      // Verify persisted in localStorage
      const saved = storage.safeGetJSON<any>('momentum_support_contact', null);
      expect(saved?.name).toBe('Dr. Sarah Jenkins');
      expect(saved?.phone).toBe('(555) 987-6543');
    });

    it('allows editing and removing an existing support contact', async () => {
      storage.safeSetJSON('momentum_support_contact', {
        name: 'Alex Friend',
        role: 'Trusted Friend',
        phone: '555-111-2222'
      });

      render(<Toolkit />);

      expect(screen.getByRole('button', { name: /Call Alex/i })).toBeInTheDocument();

      // Click edit
      const editBtn = screen.getByRole('button', { name: /Edit Support Contact/i });
      fireEvent.click(editBtn);

      expect(screen.getByText('Edit Support Contact')).toBeInTheDocument();

      // Click remove contact
      const removeBtn = screen.getByRole('button', { name: /Remove Contact/i });
      fireEvent.click(removeBtn);

      // Card resets to + Add Support Contact
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /\+ Add Support Contact/i })).toBeInTheDocument();
      });

      expect(storage.safeGetJSON('momentum_support_contact', null)).toBeNull();
    });
  });

  /* -------------------------------------------------------------
     C. THERAPY INTEGRATION EXPORT MODAL TESTS
  ------------------------------------------------------------- */
  describe('C. Therapy Integration Export Workflow', () => {
    it('opens print preview modal and triggers window.print()', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      render(<Toolkit />);

      const exportBtn = screen.getByRole('button', { name: /Export Week to PDF/i });
      fireEvent.click(exportBtn);

      expect(screen.getByText('Therapy Integration Summary')).toBeInTheDocument();

      const printBtn = screen.getAllByRole('button', { name: /Print \/ Save as PDF/i })[0];
      fireEvent.click(printBtn);

      expect(printSpy).toHaveBeenCalled();
      printSpy.mockRestore();
    });
  });

  /* -------------------------------------------------------------
     D. SECURE VAULT BACKUP TESTS
  ------------------------------------------------------------- */
  describe('D. Secure Vault Backup Exporter', () => {
    it('gathers localStorage data, creates download link, and displays success toast', async () => {
      storage.safeSetJSON('momentum_support_contact', { name: 'Support Line', phone: '988' });
      storage.safeSetJSON('momentum_decisions', [{ id: '1', dilemma: 'Test decision' }]);

      render(<Toolkit />);

      const backupBtn = screen.getByRole('button', { name: /Create Encrypted Backup/i });
      fireEvent.click(backupBtn);

      // Toast appears
      expect(await screen.findByText(/Vault backup downloaded successfully/i)).toBeInTheDocument();
    });
  });
});
