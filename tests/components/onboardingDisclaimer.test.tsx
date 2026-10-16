import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { initializeCleanUserState } from "@/utils/storage";

// Helper component to test AuthContext state
function TestConsumer() {
  const { isWelcomeModalOpen, activeUsername } = useAuth();
  return (
    <div>
      <span data-testid="active-user">{activeUsername}</span>
      <span data-testid="modal-state">{isWelcomeModalOpen ? "open" : "closed"}</span>
    </div>
  );
}

describe("First-Time Onboarding Disclaimer Flow", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("should initialize clean user state with disclaimerAccepted: false", () => {
    initializeCleanUserState("testuser", { disclaimerAccepted: false });

    expect(localStorage.getItem("momentum_disclaimer_accepted")).toBeNull();
    const profile = JSON.parse(localStorage.getItem("momentum_profile") || "{}");
    expect(profile.disclaimerAccepted).toBe(false);
  });

  it("should render Welcome to Momentum modal when user logs in with disclaimerAccepted: false", async () => {
    initializeCleanUserState("newuser", { disclaimerAccepted: false });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Modal should be open and display required sections
    expect(await screen.findByText("Welcome to Momentum")).toBeInTheDocument();
    expect(screen.getByText(/Clinical Boundary/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Guarantee/i)).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: /Accept & Enter Momentum/i });
    expect(acceptBtn).toBeDisabled();

    // Check acknowledgment checkbox
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(acceptBtn).not.toBeDisabled();

    // Click Accept & Enter Momentum
    fireEvent.click(acceptBtn);

    // Modal should close and storage should be updated to true
    await waitFor(() => {
      expect(localStorage.getItem("momentum_disclaimer_accepted")).toBe("true");
    });

    const updatedProfile = JSON.parse(localStorage.getItem("momentum_profile") || "{}");
    expect(updatedProfile.disclaimerAccepted).toBe(true);

    await waitFor(() => {
      expect(screen.queryByText("Welcome to Momentum")).not.toBeInTheDocument();
    });
  });

  it("should not render Welcome Modal if disclaimerAccepted is already true", () => {
    localStorage.setItem("momentum_disclaimer_accepted", "true");
    localStorage.setItem("momentum_profile", JSON.stringify({ username: "existing", disclaimerAccepted: true }));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.queryByText("Welcome to Momentum")).not.toBeInTheDocument();
    expect(screen.getByTestId("modal-state")).toHaveTextContent("closed");
  });
});
