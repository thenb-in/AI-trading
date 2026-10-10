'use strict';

const logger = require('@startup/logger');
const { sendMail, getSignalEmail } = require('../utils/mailerService');

function dirColor(d) {
  return d === 'BUY' ? '#16a34a' : '#dc2626';
}

function buildDailySummaryEmail(signals, dateStr) {
  const total   = signals.length;
  const buys    = signals.filter(s => s.direction === 'BUY').length;
  const sells   = signals.filter(s => s.direction === 'SELL').length;

  const rowsHtml = signals.map((s, i) => {
    const dc     = dirColor(s.direction);
    const time   = s.timestamp
      ? new Date(s.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })
      : '—';
    const sym    = s.tradingsymbol || '—';
    const prem   = s.premiumEntry != null ? `₹${s.premiumEntry.toFixed(2)}` : '—';
    const sl     = s.premiumSL    != null ? `₹${s.premiumSL.toFixed(2)}`   : '—';
    const t1     = s.premiumT1    != null ? `₹${s.premiumT1.toFixed(2)}`   : '—';
    const conf   = s.confidence   != null ? `${s.confidence}%`             : '—';
    const bg     = i % 2 === 0 ? '#f9fafb' : '#ffffff';

    return `
      <tr style="background:${bg};">
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;">${time}</td>
        <td style="padding:10px 16px;">
          <span style="display:inline-block;padding:2px 10px;border-radius:999px;
            background:${dc}18;color:${dc};font-weight:700;font-size:12px;">
            ${s.direction} ${s.optionType || ''}
          </span>
        </td>
        <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;">${sym}</td>
        <td style="padding:10px 16px;font-size:13px;color:#111827;">${prem}</td>
        <td style="padding:10px 16px;font-size:13px;color:#991b1b;">${sl}</td>
        <td style="padding:10px 16px;font-size:13px;color:#1e40af;">${t1}</td>
        <td style="padding:10px 16px;font-size:13px;color:#374151;">${conf}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="700" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#93c5fd;letter-spacing:1px;text-transform:uppercase;">
              NIFTY · Daily Signal Summary
            </p>
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;">${dateStr}</h1>
          </td>
        </tr>

        <!-- Stats row -->
        <tr>
          <td style="padding:20px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
              <tr>
                <td style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;width:30%;" align="center">
                  <div style="color:#6b7280;font-size:11px;margin-bottom:4px;">TOTAL SIGNALS</div>
                  <div style="font-weight:700;font-size:24px;color:#166534;">${total}</div>
                </td>
                <td width="12"></td>
                <td style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;width:30%;" align="center">
                  <div style="color:#6b7280;font-size:11px;margin-bottom:4px;">BUY CE</div>
                  <div style="font-weight:700;font-size:24px;color:#16a34a;">${buys}</div>
                </td>
                <td width="12"></td>
                <td style="padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;width:30%;" align="center">
                  <div style="color:#6b7280;font-size:11px;margin-bottom:4px;">BUY PE</div>
                  <div style="font-weight:700;font-size:24px;color:#dc2626;">${sells}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Signals table -->
        ${total > 0 ? `
        <tr>
          <td style="padding:20px 32px 0;">
            <p style="margin:0 0 10px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">
              Signals Generated Today
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;font-size:13px;">
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 16px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Time</th>
                <th style="padding:10px 16px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Direction</th>
                <th style="padding:10px 16px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Symbol</th>
                <th style="padding:10px 16px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Entry</th>
                <th style="padding:10px 16px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">SL</th>
                <th style="padding:10px 16px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">T1</th>
                <th style="padding:10px 16px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Conf</th>
              </tr>
              ${rowsHtml}
            </table>
          </td>
        </tr>` : `
        <tr>
          <td style="padding:28px 32px;text-align:center;color:#9ca3af;font-size:14px;">
            No trade signals were generated today.
          </td>
        </tr>`}

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;margin-top:24px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              ⚠ Automated daily summary from AI-Trading. Not financial advice. Trade at your own risk.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Called by the scheduler at 15:30 IST.
 * Receives the recHistory array from index.js (passed in at call time).
 */
async function sendDailySummaryMail(signals) {
  const recipient = getSignalEmail();
  if (!recipient) {
    logger.warn(`[DailySummary] No recipient set — configure in dashboard settings`);
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  // Only today's signals (IST date match)
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const todaySignals = (signals || []).filter(s => {
    if (!s.timestamp) {
      return false;
    }
    const d = new Date(s.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return d === todayIST;
  });

  const subject = `[AI-Trading] Daily Summary ${dateStr} - ${todaySignals.length} signal${todaySignals.length !== 1 ? 's' : ''}`;
  const content = buildDailySummaryEmail(todaySignals, dateStr);

  try {
    await sendMail(subject, content, recipient);
    logger.info(`[DailySummary] Sent — ${todaySignals.length} signals for ${todayIST}`);
  } catch (err) {
    logger.error(`[DailySummary] send failed: ${err.message}`, err);
  }
}

module.exports = { sendDailySummaryMail };
