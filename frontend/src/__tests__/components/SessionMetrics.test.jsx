import { render, screen } from '@testing-library/react';
import SessionMetrics from '../../components/SessionMetrics';

describe('SessionMetrics', () => {
  it('displays all metric values correctly', () => {
    const metrics = { attempted: 10, connected: 3, failed: 2, canceled: 5 };

    render(<SessionMetrics metrics={metrics} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    expect(screen.getByText('Attempted')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Canceled')).toBeInTheDocument();
  });

  it('displays zero values correctly', () => {
    const metrics = { attempted: 0, connected: 0, failed: 0, canceled: 0 };

    render(<SessionMetrics metrics={metrics} />);

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(4);
  });
});
