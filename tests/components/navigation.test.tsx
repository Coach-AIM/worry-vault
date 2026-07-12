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
    expect(screen.getByText("Vaults")).toBeInTheDocument();
    expect(screen.getByText("Insights")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
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

  it("should call signOut when the Sign Out button is clicked", () => {
    vi.mocked(usePathname).mockReturnValue("/");

    render(<Navigation />);

    const signOutBtn = screen.getByText("Sign Out").closest("button");
    expect(signOutBtn).toBeInTheDocument();

    fireEvent.click(signOutBtn!);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});
