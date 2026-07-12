import { describe, it, expect } from "vitest";
import { findDistortions } from "@/lib/cbtDistortions";

describe("findDistortions", () => {
  it("should return empty list for neutral text", () => {
    const text = "Today was a nice sunny day. I went for a run.";
    const result = findDistortions(text);
    expect(result).toEqual([]);
  });

  it("should find all-or-nothing thinking keywords", () => {
    const text = "I am a complete failure, nothing ever goes right.";
    const result = findDistortions(text);
    const names = result.map((r) => r.id);
    expect(names).toContain("all-or-nothing");
  });

  it("should find overgeneralization thinking keywords", () => {
    const text = "This always happens to me, nobody listens.";
    const result = findDistortions(text);
    const names = result.map((r) => r.id);
    expect(names).toContain("all-or-nothing"); // 'always'
    expect(names).toContain("overgeneralization"); // 'nobody'
  });

  it("should find catastrophizing keywords", () => {
    const text = "This mistake is a disaster, it is the worst thing ever.";
    const result = findDistortions(text);
    const names = result.map((r) => r.id);
    expect(names).toContain("catastrophizing");
  });

  it("should handle case insensitivity", () => {
    const text = "I SHOULD HAVE KNOWN BETTER.";
    const result = findDistortions(text);
    const names = result.map((r) => r.id);
    expect(names).toContain("should-statements");
  });

  it("should find mind-reading keywords", () => {
    const text = "I know he thinks I am incompetent.";
    const result = findDistortions(text);
    const names = result.map((r) => r.id);
    expect(names).toContain("mind-reading");
  });

  it("should find emotional reasoning keywords", () => {
    const text = "I feel like a loser, so I must be one.";
    const result = findDistortions(text);
    const names = result.map((r) => r.id);
    expect(names).toContain("emotional-reasoning");
  });

  it("should find overgeneralization keywords", () => {
    const text = "This always happens to me. Everybody hates me.";
    const result = findDistortions(text);
    const names = result.map((r) => r.id);
    expect(names).toContain("overgeneralization");
  });
});
