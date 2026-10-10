'use strict';

const logger = require('@startup/logger');
const { sendMail, getSignalEmail } = require('../utils/mailerService');

function directionColor(direction) {
  return direction === 'BUY' ? '#16a34a' : '#dc2626';
}

function confidenceColor(confidence) {
  if (confidence >= 85) {
    return '#16a34a';
  }
  if (confidence >= 75) {
    return '#d97706';
  }
  return '#6b7280';
}

function buildSignalEmail(rec, direction, confidence) {
  const isBuy     = direction === 'BUY';
  const dColor    = directionColor(direction);
  const cColor    = confidenceColor(confidence);
  const action    = rec.action || `${direction} ${rec.optionType}`;
  const sym       = rec.tradingsymbol || '—';
  const expiry    = rec.expiry || '—';
  const spot      = rec.spotPrice != null ? `₹${Math.round(rec.spotPrice).toLocaleString('en-IN')}` : '—';
  const entry     = rec.premiumEntry != null ? `₹${rec.premiumEntry.toFixed(2)}` : '—';
  const sl        = rec.premiumSL   != null ? `₹${rec.premiumSL.toFixed(2)}`   : '—';
  const t1        = rec.premiumT1   != null ? `₹${rec.premiumT1.toFixed(2)}`   : '—';
  const t2        = rec.premiumT2   != null ? `₹${rec.premiumT2.toFixed(2)}`   : '—';
  const t3        = rec.premiumT3   != null ? `₹${rec.premiumT3.toFixed(2)}`   : '—';
  const ulSl      = rec.ulSl        != null ? `${rec.ulSl}`                    : '—';
  const ulT1      = rec.ulT1        != null ? `${rec.ulT1}`                    : '—';
  const ulT2      = rec.ulT2        != null ? `${rec.ulT2}`                    : '—';
  const mp        = rec.maxPainLevel!= null ? `${rec.maxPainLevel}`            : '—';

  const riskAmt = rec.premiumEntry != null && rec.premiumSL != null
    ? (rec.premiumEntry - rec.premiumSL).toFixed(2) : null;
  const rr1 = riskAmt && rec.premiumT1 ? ((rec.premiumT1 - rec.premiumEntry) / riskAmt).toFixed(1) : '—';
  const rr2 = riskAmt && rec.premiumT2 ? ((rec.premiumT2 - rec.premiumEntry) / riskAmt).toFixed(1) : '—';

  const now = new Date();
  const timeIST = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false,
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const reasonsHtml = (rec.reasons || [])
    .map(r => `<li style="padding:4px 0;color:#374151;font-size:13px;line-height:1.5;">${r}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${dColor};padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:1px;text-transform:uppercase;">
              NIFTY · ${timeIST} IST
            </p>
            <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;">${action}</h1>
            <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">
              Confidence:
              <span style="font-weight:700;font-size:15px;">${confidence}%</span>
            </p>
          </td>
        </tr>

        <!-- Option details -->
        <tr>
          <td style="padding:28px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;font-size:14px;">
              <tr style="background:#f9fafb;">
                <td style="padding:10px 16px;color:#6b7280;width:38%;border-bottom:1px solid #e5e7eb;">Symbol</td>
                <td style="padding:10px 16px;color:#111827;font-weight:700;border-bottom:1px solid #e5e7eb;">${sym}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Expiry</td>
                <td style="padding:10px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">${expiry}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Spot Price</td>
                <td style="padding:10px 16px;color:#111827;font-weight:600;border-bottom:1px solid #e5e7eb;">${spot}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;color:#6b7280;">Direction</td>
                <td style="padding:10px 16px;border-bottom:none;">
                  <span style="display:inline-block;padding:2px 12px;border-radius:999px;
                    background:${dColor}18;color:${dColor};font-weight:700;font-size:13px;">
                    ${direction} ${rec.optionType || ''}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Premium levels -->
        <tr>
          <td style="padding:20px 32px 0;">
            <p style="margin:0 0 10px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">
              Premium Levels
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
              <tr>
                <td style="padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;width:22%;" align="center">
                  <div style="color:#6b7280;font-size:11px;margin-bottom:2px;">ENTRY</div>
                  <div style="font-weight:700;color:#166534;font-size:16px;">${entry}</div>
                </td>
                <td width="8"></td>
                <td style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;width:22%;" align="center">
                  <div style="color:#6b7280;font-size:11px;margin-bottom:2px;">STOP LOSS</div>
                  <div style="font-weight:700;color:#991b1b;font-size:16px;">${sl}</div>
                  ${riskAmt ? `<div style="font-size:10px;color:#9ca3af;">−₹${riskAmt}</div>` : ''}
                </td>
                <td width="8"></td>
                <td style="padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;" align="center">
                  <div style="color:#6b7280;font-size:11px;margin-bottom:2px;">T1 (1:${rr1}R)</div>
                  <div style="font-weight:700;color:#1e40af;font-size:15px;">${t1}</div>
                </td>
                <td width="8"></td>
                <td style="padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;" align="center">
                  <div style="color:#6b7280;font-size:11px;margin-bottom:2px;">T2 (1:${rr2}R)</div>
                  <div style="font-weight:700;color:#1e40af;font-size:15px;">${t2}</div>
                </td>
                <td width="8"></td>
                <td style="padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;" align="center">
                  <div style="color:#6b7280;font-size:11px;margin-bottom:2px;">T3</div>
                  <div style="font-weight:700;color:#1e40af;font-size:15px;">${t3}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Spot-level reference -->
        <tr>
          <td style="padding:16px 32px 0;">
            <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">
              Underlying Reference
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">
              <tr>
                <td style="padding:8px 16px;color:#6b7280;border-right:1px solid #e5e7eb;width:33%;">UL Stop Loss</td>
                <td style="padding:8px 16px;color:#6b7280;border-right:1px solid #e5e7eb;width:33%;">UL Target 1</td>
                <td style="padding:8px 16px;color:#6b7280;width:33%;">Max Pain</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px 16px;font-weight:600;color:#111827;border-right:1px solid #e5e7eb;">${ulSl}</td>
                <td style="padding:8px 16px;font-weight:600;color:#111827;border-right:1px solid #e5e7eb;">${ulT1}</td>
                <td style="padding:8px 16px;font-weight:600;color:#111827;">${mp}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Why this trade -->
        ${reasonsHtml ? `
        <tr>
          <td style="padding:20px 32px 0;">
            <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">
              Why this trade
            </p>
            <div style="background:#f9fafb;border-left:3px solid ${dColor};padding:12px 16px;border-radius:0 4px 4px 0;">
              <ul style="margin:0;padding-left:18px;">
                ${reasonsHtml}
              </ul>
            </div>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;margin-top:28px;" >
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              ⚠ This is an automated signal from AI-Trading. Not financial advice. Trade at your own risk.
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
 * Send a trade signal email immediately when a new recommendation is generated.
 * toEmail defaults to SIGNAL_EMAIL_TO env var.
 */
async function sendTradeSignalMail(rec, direction, confidence, toEmail) {
  const recipient = toEmail || getSignalEmail();
  if (!recipient) {
    logger.warn(`[TradeSignalMail] No recipient set — configure in dashboard settings`);
    return;
  }
  if (!rec) {
    return;
  }

  const subject = `[AI-Trading] ${direction} ${rec.optionType || ''} - ${rec.tradingsymbol || 'NIFTY'} | ${confidence}% confidence`;
  const content = buildSignalEmail(rec, direction, confidence);

  sendMail(subject, content, recipient).catch(err =>
    logger.error(`[TradeSignalMail] send failed: ${err.message}`, err)
  );
}

module.exports = { sendTradeSignalMail };
