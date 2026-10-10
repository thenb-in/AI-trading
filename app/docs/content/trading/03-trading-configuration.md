---
id: trading-configuration
title: 7.3 Trading configuration
sidebar_label: 7.3 Trading configuration
sidebar_position: 3
keywords: [configuration, tunables, market session, execution mode, signal mode, selective, medium, macd, supertrend, vix, confidence weights, strategy, symbols]
---

# 7.3 Trading configuration {#trading-configuration}

All company-specific trading settings live on one screen:
<a href="/admin/company" target="_blank" rel="noopener noreferrer">Company Settings → Company Profile</a>.
Change a value and click **Save changes**; the engines pick it up automatically (within ~60s).

![Company Profile trading configuration](../images/trading-config.png)

The tab has six sections.

## Broker account {#broker}

Zerodha Kite Connect credentials. See [Connect your Zerodha account](./02-connect-zerodha.md).

## Trading symbols {#symbols}

The index symbols this company trades and monitors. Default: **NIFTY**, **BANK NIFTY**,
**SENSEX**. Remove or add symbols with the multi-select.

## Market session (IST) {#session}

The session window and the blocks the engine refuses to trade inside.

| Setting | Default | Meaning |
| --- | --- | --- |
| Market open | 09:15 | Session start (IST, 24h). |
| Market close | 15:30 | Session end (IST, 24h). |
| Block opening 09:15–09:30 | On | Skip the opening volatility trap. |
| Block lunch 12:30–13:30 | On | Skip the midday dead zone. |
| Block closing window (15:15, 15:00 on expiry) | On | Skip the close. |
| Apply earlier closing block on expiry day | On | Tighten the close on expiry days. |

## Trade mode {#trade-mode}

Two independent switches:

| Switch | Values | Default | Meaning |
| --- | --- | --- | --- |
| Execution mode | off / dry / live | **off** | Whether the engine places orders. `dry` = paper, `live` = real orders. |
| Signal mode | selective / medium | **selective** | How strict the signal is. `selective` needs 4+ confirmations + ADX/SuperTrend gates; `medium` is looser. |

:::warning
`execution mode = live` places **real orders** on your Zerodha account. Start with `off` or
`dry` until you trust the setup. See [Live Trading](./07-live-trading.md).
:::

## Strategy tunables {#tunables}

Indicator parameters and gates shared by the engines. Defaults are the validated values carried
over from the original system — change them only after a strategy review.

| Tunable | Default |
| --- | --- |
| MACD fast / slow / signal | 12 / 26 / 9 |
| SuperTrend ATR period / multiplier | 10 / 3 |
| VIX high / low threshold | 20 / 11 |
| Volume breakout multiplier | 1.5 |
| CPR narrow threshold (% of price) | 0.003 |
| Weight signals by Put/Call ratio (PCR) | On |

## Confidence weights {#weights}

Each factor's contribution (points) to the combined 8-factor signal score.

| Factor | Default weight |
| --- | --- |
| MACD | 8 |
| VIX | 10 |
| Volume | 5 |
| SuperTrend | 10 |
| OI change | 8 |
| OI support/resistance | 7 |
| Max pain | 5 |
| Previous-day high/low (PDH/PDL) | 7 |
| CPR | 5 |

See [How it works](./12-how-it-works.md) for how these factors combine into a call.
