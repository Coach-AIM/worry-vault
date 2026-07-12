import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ExportPdfButton from "@/components/ExportPdfButton";
import jsPDF from "jspdf";

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockAddPage = vi.fn();
const mockSetTextColor = vi.fn();
const mockSplitTextToSize = vi.fn().mockImplementation((txt) => [txt]);

vi.mock("jspdf", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        save: mockSave,
        text: mockText,
        setFont: mockSetFont,
        setFontSize: mockSetFontSize,
        addPage: mockAddPage,
        setTextColor: mockSetTextColor,
        splitTextToSize: mockSplitTextToSize,
      };
    }),
  };
});

describe("ExportPdfButton Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  it("renders the export button", () => {
    render(<ExportPdfButton />);
    expect(screen.getByText("⬇ Export Week to PDF")).toBeInTheDocument();
  });

  it("triggers PDF export and handles empty data correctly", async () => {
    // Mock successful fetch responses with empty arrays
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (url === "/api/tasks") {
        return Promise.resolve({
          json: () => Promise.resolve({ tasks: [] }),
        } as Response);
      }
      if (url === "/api/journal") {
        return Promise.resolve({
          json: () => Promise.resolve({ entries: [] }),
        } as Response);
      }
      return Promise.reject(new Error("Unknown url"));
    });

    render(<ExportPdfButton />);
    const button = screen.getByText("⬇ Export Week to PDF");
    fireEvent.click(button);

    // Should show exporting state
    expect(screen.getByText("Generating PDF...")).toBeInTheDocument();

    await waitFor(() => {
      expect(jsPDF).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalledWith("momentum-weekly-summary.pdf");
    });

    // Back to normal state
    expect(screen.getByText("⬇ Export Week to PDF")).toBeInTheDocument();
  });

  it("triggers PDF export and formats task and journal entry content", async () => {
    const today = new Date().toISOString();
    const mockTasks = [
      {
        id: 1,
        title: "Read therapist notes",
        emotionalIntensity: "low",
        estimatedTime: "15m",
        completed: 1,
        createdAt: today,
      },
    ];
    const mockEntries = [
      {
        id: 10,
        entryType: "negative",
        situation: "Work stress",
        automaticThought: "I cannot handle it",
        emotionsJson: JSON.stringify([{ name: "Stressed", weight: 80 }]),
        distortionsJson: JSON.stringify(["all-or-nothing"]),
        reframedThought: "I can do it step-by-step",
        createdAt: today,
      },
    ];

    vi.mocked(global.fetch).mockImplementation((url) => {
      if (url === "/api/tasks") {
        return Promise.resolve({
          json: () => Promise.resolve({ tasks: mockTasks }),
        } as Response);
      }
      if (url === "/api/journal") {
        return Promise.resolve({
          json: () => Promise.resolve({ entries: mockEntries }),
        } as Response);
      }
      return Promise.reject(new Error("Unknown url"));
    });

    render(<ExportPdfButton />);
    const button = screen.getByText("⬇ Export Week to PDF");
    fireEvent.click(button);

    await waitFor(() => {
      expect(jsPDF).toHaveBeenCalled();
      // Should write task text
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining("Read therapist notes"),
        25,
        expect.any(Number),
      );
      // Should write situation text
      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining("Work stress"),
        170,
      );
      // Should write reframed thought text
      expect(mockSplitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining("I can do it step-by-step"),
        170,
      );
      expect(mockSave).toHaveBeenCalledWith("momentum-weekly-summary.pdf");
    });
  });

  it("displays alert on error", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    render(<ExportPdfButton />);
    const button = screen.getByText("⬇ Export Week to PDF");
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Failed to export PDF.");
    });
  });
});
