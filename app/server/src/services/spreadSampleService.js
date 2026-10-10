'use strict';

// Read side of the measured option-spread samples (spread_samples). The summary
// is computed with a raw SQL aggregate (percentile_cont) rather than the ORM, so
// the SpreadSample model object is not needed here — the query runs on the shared
// sequelize instance. See FINDINGS: spread_samples rows are written by the ticker
// service (a separate owner), so this is a read-only companion service.
const db = require('../models');
const { QueryTypes } = require('sequelize');

async function getSpreadSummary({ symbol, premMin, premMax }) {
  const rows = await db.sequelize.query(`
          select count(*)::int as samples,
                 round(avg(avg_spread)::numeric, 3) as avg_spread,
                 round(percentile_cont(0.5) within group (order by avg_spread)::numeric, 3) as median_spread,
                 round(percentile_cont(0.9) within group (order by avg_spread)::numeric, 3) as p90_spread,
                 round(max(max_spread)::numeric, 2) as worst_spread,
                 min(minute) as from_minute, max(minute) as to_minute
          from spread_samples
          where symbol = :symbol and ltp between :premMin and :premMax`,
  { replacements: { symbol, premMin, premMax }, type: QueryTypes.SELECT });
  return rows[0] ?? {};
}

module.exports = { getSpreadSummary };
