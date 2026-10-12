import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { hasDb } from '@/lib/db';
import { features } from '@/lib/env';
import { cashBalance, holdings, ledger, properties, sellerBalance, snapshotNetWorth, spendingSummary } from '@/lib/finance';
import { dateOnly, dateTime, money2 } from '@/lib/format';
import { NetWorthChart } from '@/components/Charts';
import { removeHolding, removeProperty } from './actions';
import { CashForm, HoldingForm, PayoutButton, PropertyForm } from './FinanceForms';

export const metadata = { title: 'Finance — ShopSphere' };

const KIND_LABEL: Record<string, string> = { purchase: 'Purchase', sale: 'Sale', refund: 'Refund', sale_reversal: 'Sale refunded', deposit: 'Cash added', withdrawal: 'Cash withdrawn', adjustment: 'Adjustment' };

export default async function FinancePage() {
  const user = await requireUser('/finance');
  if (!hasDb()) return <main className="page"><div className="alert alert-warn">Database not configured.</div></main>;

  const [cash, entries, seller, stocks, props, spend] = await Promise.all([
    cashBalance(user.id), ledger(user.id, 50), sellerBalance(user.id), holdings(user.id), properties(user.id), spendingSummary(user.id),
  ]);
  const netWorth = cash + stocks.totalSgd + props.equitySgd;
  const history = await snapshotNetWorth(user.id, cash, stocks.totalSgd, props.equitySgd);
  const now = Date.now();

  return <main className="page">
    <div className="page-head">
      <div><div className="eyebrow">FINANCE DASHBOARD</div><h1>Your money at a glance</h1><p>Cash, seller earnings, stocks and property — values in SGD.</p></div>
      <Link className="btn btn-ghost" href="/spending">Spending details</Link>
    </div>

    <div className="stat-grid">
      <div className="stat accent"><small>Net worth</small><strong>{money2(netWorth)}</strong><span>Cash + stocks + property equity</span></div>
      <div className="stat"><small>Cash balance</small><strong className={cash < 0 ? 'neg' : ''}>{money2(cash)}</strong><span>After all purchases &amp; sales</span></div>
      <div className="stat"><small>Spent this month</small><strong>{money2(spend.month)}</strong><span>{money2(spend.lifetime)} lifetime</span></div>
      <div className="stat"><small>Seller earnings</small><strong>{money2(seller.available)}</strong><span>available · {money2(seller.pending)} pending</span></div>
    </div>

    <div className="grid-wide">
      <div className="card"><h2>Net worth over time</h2>{history.length > 1 ? <NetWorthChart data={history} /> : <p className="hint">A daily snapshot is saved each time you open this page — the chart fills in from tomorrow.</p>}</div>
      <div className="card">
        <h2>Cash</h2>
        {entries.length === 0 && <div className="alert alert-warn">Set your opening cash so “before” and “after” balances reflect reality.</div>}
        <CashForm />
      </div>
    </div>

    <div className="card">
      <h2>Cash ledger — before &amp; after each transaction</h2>
      {entries.length === 0 ? <p className="hint">No transactions yet.</p> : <div className="table-wrap"><table className="table">
        <thead><tr><th>Date</th><th>Type</th><th>Description</th><th className="num">Before</th><th className="num">Change</th><th className="num">After</th></tr></thead>
        <tbody>{entries.map((e) => <tr key={e.id}>
          <td className="hint">{dateTime(e.createdAt)}</td>
          <td><span className="pill">{KIND_LABEL[e.kind] ?? e.kind}</span>{e.kind === 'sale' && new Date(e.availableAt).getTime() > now && <div className="hint">payout from {dateOnly(e.availableAt)}</div>}</td>
          <td>{e.description}</td>
          <td className="num">{money2(e.balanceBefore)}</td>
          <td className={`num ${e.amount >= 0 ? 'pos' : 'neg'}`}>{e.amount >= 0 ? '+' : ''}{money2(e.amount)}</td>
          <td className="num"><strong>{money2(e.balanceAfter)}</strong></td>
        </tr>)}</tbody>
      </table></div>}
    </div>

    <div className="card">
      <div className="page-head" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>Seller balance</h2><Link className="btn btn-ghost btn-sm" href="/sell/payouts">Payout settings</Link></div>
      <div className="stat-grid">
        <div className="stat"><small>Available</small><strong>{money2(seller.available)}</strong></div>
        <div className="stat"><small>Pending (7-day hold)</small><strong>{money2(seller.pending)}</strong></div>
        <div className="stat"><small>Paid out</small><strong>{money2(seller.paidOut)}</strong></div>
        <div className="stat"><small>Lifetime sales</small><strong>{money2(seller.lifetimeSales)}</strong></div>
      </div>
      <PayoutButton disabled={seller.available < 1} />
    </div>

    <div className="grid-2">
      <div className="card">
        <h2>Stocks · {money2(stocks.totalSgd)}</h2>
        {!features.quotes && <div className="alert alert-warn">Live quotes need FMP_API_KEY or FINNHUB_API_KEY.</div>}
        {stocks.missingQuotes && features.quotes && <div className="alert alert-warn">Some quotes are unavailable and are excluded from totals.</div>}
        {stocks.fxEstimated && stocks.items.some((h) => h.currency === 'USD') && <p className="hint">USD→SGD uses an estimated rate of 1.30.</p>}
        {stocks.items.length > 0 && <div className="table-wrap"><table className="table">
          <thead><tr><th>Symbol</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Value (SGD)</th><th className="num">P/L</th><th /></tr></thead>
          <tbody>{stocks.items.map((h) => <tr key={h.id}>
            <td><strong>{h.symbol}</strong><div className="hint">avg {h.avgCost.toFixed(2)} {h.currency}</div></td>
            <td className="num">{h.quantity}</td>
            <td className="num">{h.price === null ? '—' : `${h.price.toFixed(2)} ${h.currency}`}</td>
            <td className="num">{h.valueSgd === null ? '—' : money2(h.valueSgd)}</td>
            <td className={`num ${h.gainPct === null ? '' : h.gainPct >= 0 ? 'pos' : 'neg'}`}>{h.gainPct === null ? '—' : `${h.gainPct.toFixed(1)}%`}</td>
            <td className="num"><form action={removeHolding}><input type="hidden" name="id" value={h.id} /><button className="linklike">Remove</button></form></td>
          </tr>)}</tbody>
        </table></div>}
        <HoldingForm />
      </div>
      <div className="card">
        <h2>Property · {money2(props.equitySgd)} equity</h2>
        <p className="hint">Values are your own estimates — not professional valuations. For market context see URA and data.gov.sg resale data.</p>
        {props.items.length > 0 && <div className="table-wrap"><table className="table">
          <thead><tr><th>Property</th><th className="num">Est. value</th><th className="num">Loan</th><th className="num">Equity</th><th /></tr></thead>
          <tbody>{props.items.map((p) => <tr key={p.id}>
            <td><strong>{p.name}</strong><div className="hint">bought {money2(p.purchasePrice)} · valued {p.valuationDate} ({p.valueSource})</div></td>
            <td className="num">{money2(p.estValue)}</td><td className="num">{money2(p.loan)}</td><td className="num"><strong>{money2(p.equity)}</strong></td>
            <td className="num"><form action={removeProperty}><input type="hidden" name="id" value={p.id} /><button className="linklike">Remove</button></form></td>
          </tr>)}</tbody>
        </table></div>}
        <PropertyForm />
      </div>
    </div>
    <p className="hint" style={{ marginTop: 16 }}>This dashboard is for personal tracking only and is not financial advice.</p>
  </main>;
}
