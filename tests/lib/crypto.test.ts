import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/crypto";

describe("crypto utilities", () => {
  it("should hash a password and verify it successfully", () => {
    const pwd = "mySecurePassword123";
    const hashed = hashPassword(pwd);
    expect(hashed).toContain(":");

    const isValid = verifyPassword(pwd, hashed);
    expect(isValid).toBe(true);
  });

  it("should fail verification with wrong password", () => {
    const pwd = "mySecurePassword123";
    const hashed = hashPassword(pwd);

    const isValid = verifyPassword("wrongpassword", hashed);
    expect(isValid).toBe(false);
  });

  it("should return false for invalid storedHash formats", () => {
    expect(verifyPassword("password", "nosalt")).toBe(false);
    expect(verifyPassword("password", "")).toBe(false);
    expect(verifyPassword("password", null as any)).toBe(false);
  });

  it("should generate unique hashes for the same password due to random salts", () => {
    const pwd = "samePassword";
    const hashed1 = hashPassword(pwd);
    const hashed2 = hashPassword(pwd);
    expect(hashed1).not.toBe(hashed2);

    expect(verifyPassword(pwd, hashed1)).toBe(true);
    expect(verifyPassword(pwd, hashed2)).toBe(true);
  });
});
