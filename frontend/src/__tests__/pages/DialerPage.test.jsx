import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import DialerPage from '../../pages/DialerPage';

// Mock the api module
vi.mock('../../api', () => ({
  default: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
  WS_URL: 'ws://localhost:3002/ws',
  getDialerSession: vi.fn(),
  stopDialerSession: vi.fn(),
  transcribeCall: vi.fn(),
}));

// Mock the useWebSocket hook
vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    connected: false,
    error: null,
    fallbackToPolling: true,
  })),
}));

// Mock the usePolling hook so it calls fetchFn immediately
vi.mock('../../hooks/usePolling', () => ({
  usePolling: vi.fn((fetchFn, _interval, enabled) => {
    if (enabled) {
      fetchFn();
    }
  }),
}));

import { getDialerSession } from '../../api';

function renderDialerPage(sessionId = 'session-123') {
  return render(
    <MemoryRouter initialEntries={[`/dialer/${sessionId}`]}>
      <Routes>
        <Route path="/dialer/:sessionId" element={<DialerPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DialerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    // Make getDialerSession return a promise that never resolves
    getDialerSession.mockReturnValue(new Promise(() => {}));

    renderDialerPage();

    expect(screen.getByText('Loading session...')).toBeInTheDocument();
  });

  it('displays session data when loaded', async () => {
    getDialerSession.mockResolvedValue({
      data: {
        id: 'session-123',
        status: 'RUNNING',
        winnerCallId: null,
        metrics: { attempted: 3, connected: 1, failed: 1, canceled: 1 },
        calls: [
          {
            id: 'call-1',
            leadName: 'Alice Smith',
            leadPhone: '555-0100',
            leadCompany: 'Acme Corp',
            status: 'RINGING',
            callStatus: null,
          },
          {
            id: 'call-2',
            leadName: 'Bob Jones',
            leadPhone: '555-0200',
            leadCompany: 'Globex Inc',
            status: 'COMPLETED',
            callStatus: 'CONNECTED',
          },
        ],
      },
    });

    renderDialerPage();

    await waitFor(() => {
      expect(screen.getByText('Dialer Session')).toBeInTheDocument();
    });

    // Session status
    expect(screen.getByText('RUNNING')).toBeInTheDocument();

    // Metrics
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Attempted')).toBeInTheDocument();

    // Call data - Alice is in active lines, Bob appears in both call log and call card
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    // Bob Jones appears in both the call log table and the completed CallCard
    expect(screen.getAllByText('Bob Jones')).toHaveLength(2);
  });
});
