import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/navigation
const mockUsePathname = vi.fn(() => '/');
vi.mock('next/navigation', () => {
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  };
  return {
    useRouter: () => router,
    usePathname: mockUsePathname,
    useSearchParams: () => new URLSearchParams(),
  };
});

// Mock next-auth/react for client component testing
vi.mock('next-auth/react', () => {
  return {
    useSession: () => ({
      data: {
        user: {
          id: 'user_coach_1',
          name: 'Coach',
          email: 'coach@momentum.app',
        },
      },
      status: 'authenticated',
    }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
});

// Mock next-auth/next for API route testing
vi.mock('next-auth/next', () => {
  return {
    getServerSession: vi.fn().mockResolvedValue({
      user: {
        id: 'user_coach_1',
        name: 'Coach',
        email: 'coach@momentum.app',
      },
    }),
  };
});

// Mock global fetch
global.fetch = vi.fn();
