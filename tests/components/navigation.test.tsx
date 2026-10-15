import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Navigation from "@/components/Navigation";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

describe("Navigation Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all navigation links", () => {
    vi.mocked(usePathname).mockReturnValue("/");

    render(<Navigation />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Journal")).toBeInTheDocument();
    expect(screen.getByText("Action Planner")).toBeInTheDocument();
    expect(screen.getByText("Toolkit")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should highlight the active tab matching the current pathname", () => {
    // Set current path to /journal
    vi.mocked(usePathname).mockReturnValue("/journal");

    render(<Navigation />);

    const journalLink = screen.getByText("Journal").closest("a");
    const homeLink = screen.getByText("Home").closest("a");

    expect(journalLink).toHaveClass("active");
    expect(homeLink).not.toHaveClass("active");
  });

  it("should toggle the Settings drawer when Settings button is clicked", () => {
    vi.mocked(usePathname).mockReturnValue("/");

    render(<Navigation />);

    const settingsBtn = screen.getByRole("button", { name: "Settings" });
    expect(settingsBtn).toBeInTheDocument();

    fireEvent.click(settingsBtn);
    expect(screen.getByText(/Settings & Privacy/i)).toBeInTheDocument();
  });
});
