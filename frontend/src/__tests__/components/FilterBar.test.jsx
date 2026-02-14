import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterBar from '../../components/FilterBar';

describe('FilterBar', () => {
  const defaultOptions = {
    industries: ['Tech', 'Finance', 'Healthcare'],
    headcounts: ['1-10', '11-50', '51-200'],
  };

  it('renders industry and headcount dropdowns with options', () => {
    render(
      <FilterBar
        filters={{ industry: '', headcount: '' }}
        setFilters={vi.fn()}
        options={defaultOptions}
      />
    );

    // Industry dropdown
    expect(screen.getByText('All Industries')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Healthcare')).toBeInTheDocument();

    // Headcount dropdown
    expect(screen.getByText('All Headcounts')).toBeInTheDocument();
    expect(screen.getByText('1-10')).toBeInTheDocument();
    expect(screen.getByText('11-50')).toBeInTheDocument();
    expect(screen.getByText('51-200')).toBeInTheDocument();
  });

  it('calls setFilters when selection changes', async () => {
    const user = userEvent.setup();
    const setFilters = vi.fn();

    render(
      <FilterBar
        filters={{ industry: '', headcount: '' }}
        setFilters={setFilters}
        options={defaultOptions}
      />
    );

    // Get the industry dropdown (first select element)
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'Tech');

    expect(setFilters).toHaveBeenCalledWith({ industry: 'Tech', headcount: '' });
  });

  it('clear button resets filters', async () => {
    const user = userEvent.setup();
    const setFilters = vi.fn();

    render(
      <FilterBar
        filters={{ industry: 'Tech', headcount: '1-10' }}
        setFilters={setFilters}
        options={defaultOptions}
      />
    );

    await user.click(screen.getByText('Clear Filters'));

    expect(setFilters).toHaveBeenCalledWith({ industry: '', headcount: '' });
  });
});
