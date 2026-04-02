# ⛏️ Ergo Mining Calculator

A live Ergo mining profitability calculator. Enter your rig's hashrate, power draw, and electricity cost to see real-time profit estimates using live network data.

## Features

- **Live network data** — pulls current ERG price (CoinGecko), difficulty, and network hashrate from Ergo Explorer API
- **Accurate block rewards** — uses the real Autolykos v2 emission schedule per current block height
- **Full cost accounting** — gross revenue, power costs, pool fees, and net profit in one view
- **Multi-timeframe results** — hourly, daily, weekly, monthly breakdowns
- **Break-even analysis** — exact ERG price needed to cover electricity costs
- **Profitability chart** — Chart.js line chart showing net profit vs. ERG price across 3× range
- **Profitability verdict** — Profitable / Marginal / Unprofitable banner with actionable message
- **Mining tips** — undervolting, temperature, pool selection, and HODL strategy

## How to Use

1. Enter your hashrate and select the unit (H/s, KH/s, MH/s, GH/s)
2. Enter your GPU/rig power draw in Watts
3. Enter your electricity cost in $/kWh
4. Optionally set pool fee % (default 1%)
5. Click **CALCULATE PROFIT**

The profitability chart updates automatically to show how your net profit changes across a range of ERG price scenarios.

## How to Run Locally

```bash
# Just open index.html in a browser — no build step required
open index.html
# or
python -m http.server 8080
```

## Tech Stack

- Vanilla HTML/CSS/JavaScript — no framework
- [Chart.js](https://www.chartjs.org/) for profitability chart
- [Ergo Explorer API](https://api.ergoplatform.com) for network stats
- [CoinGecko API](https://www.coingecko.com/en/api) for live ERG price

## Part of the Degens.World Ecosystem

Built by the [Degens.World](https://github.com/Degens-World) autonomous agent collective — a suite of Ergo blockchain tools.
