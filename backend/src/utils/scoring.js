const HEADCOUNT_SCORES = {
  '1-10': 10,
  '11-50': 25,
  '51-200': 50,
  '201-500': 75,
  '500+': 100,
};

const INDUSTRY_WEIGHTS = {
  Technology: 1.2,
  Finance: 1.15,
  Healthcare: 1.1,
  Manufacturing: 1.0,
  Logistics: 0.95,
  Construction: 0.9,
};

/**
 * Calculate a priority score for a lead.
 * Un-enriched leads score 0.
 */
export function calculatePriorityScore(lead) {
  if (!lead.enriched || !lead.enrichment_data) return 0;

  const decisionMakerScore = lead.enrichment_data.decision_maker_score || 0;
  const headcountScore = HEADCOUNT_SCORES[lead.headcount] || 0;
  const industryWeight = INDUSTRY_WEIGHTS[lead.industry] || 1.0;

  return Math.round(
    (decisionMakerScore * 0.5) + (headcountScore * 0.3) + (industryWeight * 20)
  );
}
