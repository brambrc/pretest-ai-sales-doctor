import { render, screen } from '@testing-library/react';
import CallCard from '../../components/CallCard';

const makeCall = (overrides = {}) => ({
  id: 'call-1',
  leadName: 'Alice Smith',
  leadPhone: '555-0100',
  leadCompany: 'Acme Corp',
  status: 'RINGING',
  callStatus: null,
  recordingUrl: null,
  transcriptionStatus: null,
  transcriptionText: null,
  ...overrides,
});

describe('CallCard', () => {
  it('renders with RINGING status and shows ringing indicator dots', () => {
    const call = makeCall({ status: 'RINGING' });

    const { container } = render(
      <CallCard call={call} isWinner={false} onTranscribe={vi.fn()} />
    );

    expect(screen.getByText('RINGING...')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();

    // Check ringing indicator dots exist
    const dots = container.querySelectorAll('.dot');
    expect(dots).toHaveLength(3);

    // The card itself should have the 'ringing' class
    const card = container.querySelector('.call-card');
    expect(card).toHaveClass('ringing');
  });

  it('renders with CONNECTED status', () => {
    const call = makeCall({
      status: 'COMPLETED',
      callStatus: 'CONNECTED',
    });

    const { container } = render(
      <CallCard call={call} isWinner={false} onTranscribe={vi.fn()} />
    );

    expect(screen.getByText('CONNECTED')).toBeInTheDocument();
    const card = container.querySelector('.call-card');
    expect(card).toHaveClass('connected');
  });

  it('shows WINNER label when isWinner is true', () => {
    const call = makeCall({
      status: 'COMPLETED',
      callStatus: 'CONNECTED',
    });

    const { container } = render(
      <CallCard call={call} isWinner={true} onTranscribe={vi.fn()} />
    );

    expect(screen.getByText('WINNER')).toBeInTheDocument();
    const card = container.querySelector('.call-card');
    expect(card).toHaveClass('winner');
  });

  it('applies canceled class for CANCELED_BY_DIALER status', () => {
    const call = makeCall({
      status: 'COMPLETED',
      callStatus: 'CANCELED_BY_DIALER',
    });

    const { container } = render(
      <CallCard call={call} isWinner={false} onTranscribe={vi.fn()} />
    );

    expect(screen.getByText('CANCELED_BY_DIALER')).toBeInTheDocument();
    const card = container.querySelector('.call-card');
    expect(card).toHaveClass('canceled');
  });
});
