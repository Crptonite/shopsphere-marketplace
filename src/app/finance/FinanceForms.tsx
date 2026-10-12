'use client';

import { useActionState } from 'react';
import { addHolding, addProperty, adjustCash, requestPayout, type ActionState } from './actions';

function Status({ state }: { state: ActionState }) {
  if (!state) return null;
  return <div className={`alert ${state.error ? 'alert-error' : 'alert-ok'}`} role="status" style={{ marginBottom: 0 }}>{state.error ?? state.ok}</div>;
}

export function CashForm() {
  const [state, action, pending] = useActionState(adjustCash, undefined);
  return <form className="form" action={action}>
    <div className="form-row">
      <label>Type<select name="direction"><option value="deposit">Add cash</option><option value="withdrawal">Withdraw cash</option></select></label>
      <label>Amount (SGD)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
    </div>
    <label>Note<input name="note" maxLength={120} placeholder="Opening balance, salary, ATM withdrawal…" /></label>
    <Status state={state} />
    <button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Record'}</button>
  </form>;
}

export function HoldingForm() {
  const [state, action, pending] = useActionState(addHolding, undefined);
  return <form className="form" action={action} style={{ marginTop: 12 }}>
    <div className="form-row">
      <label>Ticker<input name="symbol" required maxLength={15} placeholder="AAPL or D05.SI" /></label>
      <label>Quantity<input name="quantity" type="number" min="0.000001" step="any" required /></label>
      <label>Avg cost<input name="avgCost" type="number" min="0" step="any" required /></label>
      <label>Currency<select name="currency"><option>USD</option><option>SGD</option></select></label>
    </div>
    <Status state={state} />
    <button className="btn btn-ghost" disabled={pending}>Add holding</button>
  </form>;
}

export function PropertyForm() {
  const [state, action, pending] = useActionState(addProperty, undefined);
  return <form className="form" action={action} style={{ marginTop: 12 }}>
    <label>Name<input name="name" required maxLength={120} placeholder="4-room HDB, Tampines" /></label>
    <div className="form-row">
      <label>Purchase price<input name="purchasePrice" type="number" min="0" step="1" required /></label>
      <label>Estimated value<input name="estValue" type="number" min="0" step="1" required /></label>
      <label>Outstanding loan<input name="loan" type="number" min="0" step="1" defaultValue={0} /></label>
      <label>Valued on<input name="valuationDate" type="date" /></label>
    </div>
    <Status state={state} />
    <button className="btn btn-ghost" disabled={pending}>Add property</button>
  </form>;
}

export function PayoutButton({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(requestPayout, undefined);
  return <form action={action} className="form">
    <Status state={state} />
    <button className="btn" disabled={disabled || pending}>{pending ? 'Transferring…' : 'Pay out available balance'}</button>
  </form>;
}
