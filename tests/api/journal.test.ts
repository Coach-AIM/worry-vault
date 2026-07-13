import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/journal/route";
import { getServerSession } from "next-auth/next";
import { journalEntries } from "@/db/schema";

// Setup fluent mocks for Drizzle
const mockReturningFn = vi.fn();
const mockValuesFn = vi.fn().mockImplementation(() => ({
  returning: mockReturningFn,
}));
const mockInsertFn = vi.fn().mockImplementation(() => ({
  values: mockValuesFn,
}));

const mockOrderByFn = vi.fn();
const mockWhereFn = vi.fn().mockImplementation(() => {
  const p: any = Promise.resolve([]);
  p.orderBy = mockOrderByFn;
  return p;
});
const mockFromFn = vi.fn().mockImplementation(() => ({
  where: mockWhereFn,
}));
const mockSelectFn = vi.fn().mockImplementation(() => ({
  from: mockFromFn,
}));
const mockRunFn = vi.fn();

vi.mock("@/db/index", () => {
  return {
    db: {
      insert: (table: any) => mockInsertFn(table),
      select: () => mockSelectFn(),
      run: (query: any) => mockRunFn(query),
    },
  };
});

describe("/api/journal API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocked user session
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user_coach_1", name: "Coach" },
    });
  });

  describe("GET", () => {
    it("should return 401 if user is unauthorized", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const response = await GET();
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return entries from the database", async () => {
      const mockEntries = [
        { id: 1, situation: "Test situation 1", userId: "user_coach_1" },
        { id: 2, situation: "Test situation 2", userId: "user_coach_1" },
      ];
      mockOrderByFn.mockResolvedValueOnce(mockEntries);

      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.entries).toEqual(mockEntries);
      expect(mockSelectFn).toHaveBeenCalled();
      expect(mockFromFn).toHaveBeenCalledWith(journalEntries);
    });

    it("should return 500 when database fetch throws", async () => {
      mockOrderByFn.mockRejectedValueOnce(new Error("DB connection failed"));

      const response = await GET();
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("DB connection failed");
    });
  });

  describe("POST", () => {
    it("should return 401 if user is unauthorized", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/journal", {
        method: "POST",
        body: JSON.stringify({ situation: "unauthorized test" }),
      });
      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it("should insert and return a journal entry", async () => {
      const entryData = {
        entryType: "negative",
        situation: "Feeling stressed about presenting",
        emotionsJson: { Anxious: 75 },
        automaticThought: "I am going to stutter and fail",
        distortionsJson: ["all-or-nothing", "catastrophizing"],
        reframedThought: "It is okay if I stutter. I will get through it.",
      };

      const mockDbResponse = [
        { id: 123, ...entryData, userId: "user_coach_1" },
      ];
      mockRunFn.mockResolvedValueOnce({ lastInsertRowid: 123n });
      mockWhereFn.mockImplementationOnce(() => Promise.resolve(mockDbResponse));

      const req = new Request("http://localhost/api/journal", {
        method: "POST",
        body: JSON.stringify(entryData),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockDbResponse);

      expect(mockRunFn).toHaveBeenCalled();
      expect(mockSelectFn).toHaveBeenCalled();
    });

    it("should return 500 when database insertion fails", async () => {
      mockRunFn.mockRejectedValueOnce(new Error("Insertion failed"));

      const req = new Request("http://localhost/api/journal", {
        method: "POST",
        body: JSON.stringify({ situation: "error test" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("Insertion failed");
    });
  });
});
