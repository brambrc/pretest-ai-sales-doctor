import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadTable from '../../components/LeadTable';

const makeLead = (overrides = {}) => ({
  id: 1,
  name: 'Alice Smith',
  job_title: 'Engineer',
  company: 'Acme Corp',
  email: 'alice@acme.com',
  phone_number: '555-0100',
  industry: 'Tech',
  headcount: '50-100',
  priority_score: 0,
  enriched: false,
  ...overrides,
});

describe('LeadTable', () => {
  it('renders leads in table rows', () => {
    const leads = [
      makeLead({ id: 1, name: 'Alice Smith', company: 'Acme Corp' }),
      makeLead({ id: 2, name: 'Bob Jones', company: 'Globex Inc' }),
    ];

    render(
      <LeadTable
        leads={leads}
        onEnrich={vi.fn()}
        loading={false}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleAll={vi.fn()}
      />
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Globex Inc')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <LeadTable
        leads={[]}
        onEnrich={vi.fn()}
        loading={true}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleAll={vi.fn()}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('checkbox selection toggles selectedIds', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    const leads = [makeLead({ id: 42, name: 'Charlie' })];

    render(
      <LeadTable
        leads={leads}
        onEnrich={vi.fn()}
        loading={false}
        selectedIds={new Set()}
        onToggleSelect={onToggleSelect}
        onToggleAll={vi.fn()}
      />
    );

    // There should be two checkboxes: one "select all" in the header and one per row
    const checkboxes = screen.getAllByRole('checkbox');
    // Click the row-level checkbox (second one)
    await user.click(checkboxes[1]);

    expect(onToggleSelect).toHaveBeenCalledWith(42);
  });

  it('select all checkbox calls onToggleAll', async () => {
    const user = userEvent.setup();
    const onToggleAll = vi.fn();
    const leads = [
      makeLead({ id: 1, name: 'Alice' }),
      makeLead({ id: 2, name: 'Bob' }),
    ];

    render(
      <LeadTable
        leads={leads}
        onEnrich={vi.fn()}
        loading={false}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleAll={onToggleAll}
      />
    );

    // The first checkbox is the "select all" in the thead
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });

  it('enrich button calls onEnrich and shows Enriched when already enriched', async () => {
    const user = userEvent.setup();
    const onEnrich = vi.fn();
    const leads = [
      makeLead({ id: 10, name: 'Dave', enriched: false }),
      makeLead({ id: 11, name: 'Eve', enriched: true }),
    ];

    render(
      <LeadTable
        leads={leads}
        onEnrich={onEnrich}
        loading={false}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleAll={vi.fn()}
      />
    );

    // The non-enriched lead should have an "Enrich" button
    const enrichButton = screen.getByRole('button', { name: 'Enrich' });
    expect(enrichButton).not.toBeDisabled();
    await user.click(enrichButton);
    expect(onEnrich).toHaveBeenCalledWith(10);

    // The enriched lead should show "Enriched" and be disabled
    const enrichedButton = screen.getByRole('button', { name: 'Enriched' });
    expect(enrichedButton).toBeDisabled();
  });

  it('displays priority badges correctly', () => {
    const leads = [
      makeLead({ id: 1, name: 'None Priority', priority_score: 0 }),
      makeLead({ id: 2, name: 'Low Priority', priority_score: 30 }),
      makeLead({ id: 3, name: 'Med Priority', priority_score: 50 }),
      makeLead({ id: 4, name: 'High Priority', priority_score: 80 }),
    ];

    render(
      <LeadTable
        leads={leads}
        onEnrich={vi.fn()}
        loading={false}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleAll={vi.fn()}
      />
    );

    expect(screen.getByText('None')).toHaveClass('priority-badge', 'none');
    expect(screen.getByText('Low (30)')).toHaveClass('priority-badge', 'low');
    expect(screen.getByText('Med (50)')).toHaveClass('priority-badge', 'medium');
    expect(screen.getByText('High (80)')).toHaveClass('priority-badge', 'high');
  });
});
