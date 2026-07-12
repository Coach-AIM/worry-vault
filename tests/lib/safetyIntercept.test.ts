import { describe, it, expect } from "vitest";
import { checkSafety } from "@/lib/safetyIntercept";

describe("checkSafety", () => {
  it("should return false for empty or null/undefined inputs", () => {
    expect(checkSafety("")).toBe(false);
    expect(checkSafety(null as any)).toBe(false);
    expect(checkSafety(undefined as any)).toBe(false);
  });

  it("should return false for safe/normal text", () => {
    expect(
      checkSafety("I had a stressful day at work but I am feeling okay now."),
    ).toBe(false);
    expect(checkSafety("I need to kill the process in task manager.")).toBe(
      false,
    );
  });

  it("should return true when a crisis keyword is found", () => {
    expect(checkSafety("I want to commit suicide")).toBe(true);
    expect(checkSafety("Sometimes I feel like I just want to die")).toBe(true);
    expect(checkSafety("I want to hurt myself")).toBe(true);
  });

  it("should be case-insensitive", () => {
    expect(checkSafety("SUICIDE IS NOT THE ANSWER")).toBe(true);
    expect(checkSafety("i want to KILL MYSELF")).toBe(true);
  });
});
