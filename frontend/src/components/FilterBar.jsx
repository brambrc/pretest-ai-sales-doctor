function FilterBar({ filters, setFilters, options }) {
  return (
    <div className="filter-bar">
      <select
        value={filters.industry}
        onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
      >
        <option value="">All Industries</option>
        {options.industries?.map((ind) => (
          <option key={ind} value={ind}>{ind}</option>
        ))}
      </select>

      <select
        value={filters.headcount}
        onChange={(e) => setFilters({ ...filters, headcount: e.target.value })}
      >
        <option value="">All Headcounts</option>
        {options.headcounts?.map((hc) => (
          <option key={hc} value={hc}>{hc}</option>
        ))}
      </select>

      <button onClick={() => setFilters({ industry: '', headcount: '' })}>
        Clear Filters
      </button>
    </div>
  );
}

export default FilterBar;