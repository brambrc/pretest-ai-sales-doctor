import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LeadsPage from '../../pages/LeadsPage';

// Mock the api module
vi.mock('../../api', () => ({
  default: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  getLeads: vi.fn(),
  getFilterOptions: vi.fn(),
  enrichLead: vi.fn(),
  createDialerSession: vi.fn(),
  getAgentSessions: vi.fn(),
}));

// Mock the AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { id: 1, name: 'Test User', email: 'test@test.com' },
    token: 'fake-token',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
  }),
}));

import { getLeads, getFilterOptions, getAgentSessions } from '../../api';

describe('LeadsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getFilterOptions.mockResolvedValue({
      data: { industries: ['Tech', 'Finance'], headcounts: ['1-10', '11-50'] },
    });

    getAgentSessions.mockResolvedValue({
      data: { sessions: [] },
    });
  });

  it('fetches and displays leads', async () => {
    getLeads.mockResolvedValue({
      data: {
        leads: [
          {
            id: 1,
            name: 'Alice Smith',
            job_title: 'Engineer',
            company: 'Acme Corp',
            email: 'alice@acme.com',
            phone_number: '555-0100',
            industry: 'Tech',
            headcount: '50-100',
            priority_score: 75,
            enriched: false,
          },
          {
            id: 2,
            name: 'Bob Jones',
            job_title: 'Manager',
            company: 'Globex Inc',
            email: 'bob@globex.com',
            phone_number: '555-0200',
            industry: 'Finance',
            headcount: '100-500',
            priority_score: 30,
            enriched: true,
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Globex Inc')).toBeInTheDocument();
    expect(getLeads).toHaveBeenCalled();
  });

  it('shows loading state initially', () => {
    // Make getLeads return a promise that never resolves, keeping the loading state
    getLeads.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <LeadsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
