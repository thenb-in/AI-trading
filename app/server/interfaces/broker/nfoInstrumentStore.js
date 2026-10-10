'use strict';
const { Op } = require('sequelize');
const logger = require('@startup/logger');
const { NfoInstrument } = require('@appServer/src/models');
const { getKiteWithAccessToken } = require('./kiteClient');

/**
 * Save today's full NFO instruments list to the nfo_instruments table.
 * Called by the nightly cron at 18:00 IST after market close.
 * Uses INSERT ... ON CONFLICT DO NOTHING so reruns are safe.
 *
 * Returns { inserted, skipped } counts.
 */
async function saveNfoInstrumentsSnapshot() {
  const kite = getKiteWithAccessToken();
  const instruments = await kite.getInstruments('NFO');

  if (!Array.isArray(instruments) || instruments.length === 0) {
    throw new Error(`getInstruments returned empty list`);
  }

  // IST date string YYYY-MM-DD
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  /**
   * Formats a value as an IST calendar date (YYYY-MM-DD).
   *
   * The KiteConnect SDK hands back `expiry` as a Date object, and the previous
   * code did String(date).slice(0, 10). That yields "Tue May 19" — the YEAR is
   * cut off — which Sequelize's DATEONLY then re-parses in JS, where V8 defaults
   * a missing year to 2001. Every stored expiry was wrong by decades.
   *
   * toISOString().slice(0, 10) is not the fix either: an expiry at IST midnight
   * is the PREVIOUS day in UTC, so it lands one day early. Shift into IST first,
   * then read the UTC components.
   */
  const toIstDateString = (value) => {
    if (!value) {
      return null;
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  };

  const snapshotDate = toIstDateString(new Date());

  // A NaN in any numeric field reaches Postgres unquoted and blows up the
  // whole bulk insert with "column \"nan\" does not exist" — the SDK parses
  // blank CSV cells to NaN. Coerce anything non-finite to null.
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

  const rows = instruments.map(inst => ({
    snapshot_date:    snapshotDate,
    instrument_token: num(inst.instrument_token),
    exchange_token:   num(inst.exchange_token),
    tradingsymbol:    inst.tradingsymbol,
    name:             inst.name ?? null,
    expiry:           toIstDateString(inst.expiry),
    strike:           num(inst.strike),
    lot_size:         num(inst.lot_size),
    instrument_type:  inst.instrument_type ?? null,
    segment:          inst.segment ?? null,
    exchange:         inst.exchange ?? null
  })).filter(r => r.instrument_token != null && r.tradingsymbol);

  let inserted = 0;
  let skipped  = 0;

  // Bulk insert in chunks of 500; ignore duplicates
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const result = await NfoInstrument.bulkCreate(chunk, {
      ignoreDuplicates: true,
      returning: false
    });
    inserted += result.length;
    skipped  += chunk.length - result.length;
  }

  logger.info(`[nfoInstruments] Snapshot ${snapshotDate}: ${inserted} inserted, ${skipped} already existed`);
  return { inserted, skipped, date: snapshotDate };
}

/**
 * Look up instrument_token for a specific option by tradingsymbol on a given date.
 * Searches the nfo_instruments table for the nearest snapshot_date <= queryDate.
 *
 * @param {string} tradingsymbol  e.g. "NIFTY25MAY24200CE"
 * @param {string} queryDate      YYYY-MM-DD (date the trade was taken)
 * @returns {number|null}         instrument_token or null if not found
 */
async function lookupOptionToken(tradingsymbol, queryDate) {
  const row = await NfoInstrument.findOne({
    where: {
      tradingsymbol,
      snapshot_date: { [Op.lte]: queryDate }
    },
    order: [['snapshot_date', 'DESC']],
    attributes: ['instrument_token']
  });

  return row ? Number(row.instrument_token) : null;
}

module.exports = {
  saveNfoInstrumentsSnapshot,
  lookupOptionToken
};
