import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Wallet, Home, Receipt, Coffee, PiggyBank, CreditCard, Users, ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'monthly-budget-v1';

const emptyRow = (label = '') => ({ id: crypto.randomUUID(), label, amount: '' });

const defaultState = {
  income: [emptyRow('Salary')],
  fixed: [emptyRow('Rent'), emptyRow('Electricity'), emptyRow('Internet'), emptyRow('Phone')],
  bills: [emptyRow('Car insurance'), emptyRow('Gym membership')],
  discretionary: [emptyRow('Eating out'), emptyRow('Entertainment'), emptyRow('Shopping')],
  savings: [emptyRow('Savings transfer')],
  debt: [emptyRow('Credit card payment')],
  shared: { expected: '', actual: '', note: '' },
};

const SECTION_META = {
  income:        { title: 'Income',              icon: Wallet,     sign: 1,  hint: 'What comes in this month' },
  fixed:         { title: 'Fixed Expenses',       icon: Home,       sign: -1, hint: 'Rent, utilities — the non-negotiables' },
  bills:         { title: 'Other Bills',          icon: Receipt,    sign: -1, hint: 'Insurance, subscriptions, memberships' },
  discretionary: { title: 'Discretionary',        icon: Coffee,     sign: -1, hint: 'Eating out, fun, shopping' },
  savings:       { title: 'Savings & Investing',  icon: PiggyBank,  sign: -1, hint: 'Money you\'re setting aside, not spending' },
  debt:          { title: 'Debt Payments',        icon: CreditCard, sign: -1, hint: 'Loans, credit cards' },
};

function parseNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function fmt(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function Row({ row, onChange, onRemove, placeholder }) {
  return (
    <div className="row">
      <input
        className="row-label"
        type="text"
        value={row.label}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...row, label: e.target.value })}
      />
      <div className="row-amount-wrap">
        <span className="row-currency">$</span>
        <input
          className="row-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={row.amount}
          placeholder="0.00"
          onChange={(e) => onChange({ ...row, amount: e.target.value })}
        />
      </div>
      <button className="row-remove" onClick={onRemove} aria-label="Remove item">
        <Trash2 size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function Section({ id, rows, meta, total, onChange, onAdd, onRemove, collapsed, onToggle }) {
  const Icon = meta.icon;
  return (
    <section className="section">
      <button className="section-head" onClick={onToggle}>
        <div className="section-head-left">
          <span className="section-icon"><Icon size={16} strokeWidth={1.75} /></span>
          <div>
            <h2>{meta.title}</h2>
            <p className="section-hint">{meta.hint}</p>
          </div>
        </div>
        <div className="section-head-right">
          <span className={`section-total ${meta.sign < 0 ? 'neg' : 'pos'}`}>
            {meta.sign < 0 ? '−' : '+'}{fmt(Math.abs(total))}
          </span>
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </button>

      {!collapsed && (
        <div className="section-body">
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              placeholder="Description"
              onChange={(updated) => onChange(id, row.id, updated)}
              onRemove={() => onRemove(id, row.id)}
            />
          ))}
          <button className="add-row" onClick={() => onAdd(id)}>
            <Plus size={14} strokeWidth={2} /> Add item
          </button>
        </div>
      )}
    </section>
  );
}

export default function BudgetTracker() {
  const [state, setState] = useState(defaultState);
  const [collapsedMap, setCollapsedMap] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
  const [monthLabel, setMonthLabel] = useState(() => {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({ ...defaultState, ...parsed });
        if (parsed.monthLabel) setMonthLabel(parsed.monthLabel);
      }
    } catch (e) {
      // no saved data yet, that's fine
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save (debounced)
  useEffect(() => {
    if (!loaded) return;
    setSaveStatus('saving');
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, monthLabel }));
        setSaveStatus('saved');
      } catch (e) {
        setSaveStatus('idle');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [state, monthLabel, loaded]);

  const updateRow = useCallback((sectionId, rowId, updated) => {
    setState((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId].map((r) => (r.id === rowId ? updated : r)),
    }));
  }, []);

  const addRow = useCallback((sectionId) => {
    setState((prev) => ({ ...prev, [sectionId]: [...prev[sectionId], emptyRow()] }));
  }, []);

  const removeRow = useCallback((sectionId, rowId) => {
    setState((prev) => ({ ...prev, [sectionId]: prev[sectionId].filter((r) => r.id !== rowId) }));
  }, []);

  const toggle = (id) => setCollapsedMap((p) => ({ ...p, [id]: !p[id] }));

  const totals = Object.fromEntries(
    Object.keys(SECTION_META).map((k) => [k, state[k].reduce((s, r) => s + parseNum(r.amount), 0)])
  );

  const sharedExpected = parseNum(state.shared.expected);
  const sharedActual = parseNum(state.shared.actual);
  const sharedDiff = sharedActual - sharedExpected; // positive = owed more than budgeted

  const totalOutflow =
    totals.fixed + totals.bills + totals.discretionary + totals.savings + totals.debt + sharedActual;
  const surplus = totals.income - totalOutflow;

  return (
    <div className="app">
      <style>{`
        * { box-sizing: border-box; }

        .app {
          --ink: #1c1a17;
          --paper: #faf7f1;
          --paper-raised: #ffffff;
          --line: #e4ddd0;
          --moss: #4a5d44;
          --moss-light: #eef1ea;
          --rust: #af5b3f;
          --rust-light: #f6e9e3;
          --muted: #8a8174;
          font-family: 'Inter', sans-serif;
          background: var(--paper);
          color: var(--ink);
          min-height: 100vh;
          padding: 24px 16px 80px;
          max-width: 640px;
          margin: 0 auto;
        }

        h1, h2 { font-family: 'Fraunces', serif; margin: 0; }

        .header {
          margin-bottom: 24px;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 6px;
        }
        .header-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        h1 {
          font-size: 28px;
          font-weight: 600;
          font-variation-settings: 'opsz' 40;
        }
        .month-input {
          font-family: 'Fraunces', serif;
          font-size: 15px;
          font-weight: 500;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--line);
          color: var(--muted);
          text-align: right;
          padding: 2px 0;
          width: 150px;
        }
        .month-input:focus { outline: none; border-bottom-color: var(--rust); color: var(--ink); }

        .save-status {
          font-size: 11px;
          color: var(--muted);
          margin-top: 4px;
          height: 14px;
        }

        /* Surplus hero */
        .surplus-card {
          background: var(--ink);
          color: var(--paper);
          border-radius: 14px;
          padding: 22px 20px;
          margin-bottom: 22px;
          position: relative;
          overflow: hidden;
        }
        .surplus-card::before {
          content: '';
          position: absolute;
          top: -40%;
          right: -10%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(175,91,63,0.35), transparent 70%);
        }
        .surplus-label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.65;
          margin-bottom: 6px;
          position: relative;
        }
        .surplus-amount {
          font-family: 'Fraunces', serif;
          font-size: 42px;
          font-weight: 600;
          line-height: 1;
          position: relative;
        }
        .surplus-amount.negative { color: #e8a195; }
        .surplus-breakdown {
          display: flex;
          gap: 18px;
          margin-top: 14px;
          font-size: 12.5px;
          opacity: 0.8;
          position: relative;
          flex-wrap: wrap;
        }
        .surplus-breakdown span b { font-weight: 600; }

        /* Sections */
        .section {
          background: var(--paper-raised);
          border: 1px solid var(--line);
          border-radius: 12px;
          margin-bottom: 12px;
          overflow: hidden;
        }
        .section-head {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          color: var(--ink);
        }
        .section-head-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .section-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--moss-light);
          color: var(--moss);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .section-head h2 {
          font-size: 15.5px;
          font-weight: 600;
        }
        .section-hint {
          font-size: 11.5px;
          color: var(--muted);
          margin: 2px 0 0;
        }
        .section-head-right {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
        }
        .section-total {
          font-family: 'Fraunces', serif;
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
        }
        .section-total.neg { color: var(--rust); }
        .section-total.pos { color: var(--moss); }

        .section-body {
          padding: 4px 16px 14px;
          border-top: 1px solid var(--line);
        }

        .row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 0;
          border-bottom: 1px solid #f0ebe1;
        }
        .row:last-of-type { border-bottom: none; }
        .row-label {
          flex: 1;
          border: none;
          background: none;
          font-size: 14px;
          color: var(--ink);
          font-family: inherit;
          padding: 4px 2px;
        }
        .row-label:focus { outline: none; }
        .row-label::placeholder { color: #c2b9a8; }

        .row-amount-wrap {
          display: flex;
          align-items: center;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 7px;
          padding: 0 8px;
          width: 110px;
          flex-shrink: 0;
        }
        .row-currency { font-size: 13px; color: var(--muted); margin-right: 2px; }
        .row-amount {
          border: none;
          background: none;
          font-family: inherit;
          font-size: 14px;
          width: 100%;
          padding: 6px 0;
          text-align: right;
        }
        .row-amount:focus { outline: none; }

        .row-remove {
          border: none;
          background: none;
          color: #c2b9a8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          flex-shrink: 0;
        }
        .row-remove:hover { color: var(--rust); }

        .add-row {
          display: flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: none;
          color: var(--moss);
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          padding: 9px 2px 4px;
        }
        .add-row:hover { text-decoration: underline; }

        /* Shared expenses card */
        .shared-card {
          background: var(--rust-light);
          border: 1px solid #e8cdbf;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .shared-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .shared-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #fff;
          color: var(--rust);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .shared-head h2 { font-size: 15.5px; font-weight: 600; }
        .shared-hint { font-size: 11.5px; color: #9c6a55; margin: 2px 0 0; }

        .shared-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .shared-field label {
          display: block;
          font-size: 11px;
          color: #9c6a55;
          margin-bottom: 4px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .shared-field .row-amount-wrap {
          width: 100%;
          background: #fff;
        }

        .shared-note {
          width: 100%;
          border: 1px solid #e8cdbf;
          background: #fff;
          border-radius: 7px;
          padding: 8px 10px;
          font-family: inherit;
          font-size: 13px;
          color: var(--ink);
          resize: none;
          margin-bottom: 10px;
        }
        .shared-note:focus { outline: none; border-color: var(--rust); }
        .shared-note::placeholder { color: #c7a394; }

        .shared-diff {
          font-size: 13px;
          padding: 8px 10px;
          border-radius: 7px;
          background: rgba(255,255,255,0.6);
          color: #7a4a38;
        }
        .shared-diff b { font-family: 'Fraunces', serif; }

        footer {
          text-align: center;
          font-size: 11px;
          color: var(--muted);
          margin-top: 24px;
        }

        @media (max-width: 380px) {
          .surplus-amount { font-size: 34px; }
          .row-amount-wrap { width: 92px; }
        }
      `}</style>

      <div className="header">
        <div className="eyebrow">Monthly Budget</div>
        <div className="header-row">
          <h1>Organise your month</h1>
        </div>
        <input
          className="month-input"
          value={monthLabel}
          onChange={(e) => setMonthLabel(e.target.value)}
          style={{ marginTop: 8 }}
        />
        <div className="save-status">
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : ''}
        </div>
      </div>

      <div className="surplus-card">
        <div className="surplus-label">Surplus this month</div>
        <div className={`surplus-amount ${surplus < 0 ? 'negative' : ''}`}>{fmt(surplus)}</div>
        <div className="surplus-breakdown">
          <span>Income: <b>{fmt(totals.income)}</b></span>
          <span>Outflow: <b>{fmt(totalOutflow)}</b></span>
        </div>
      </div>

      <Section
        id="income"
        rows={state.income}
        meta={SECTION_META.income}
        total={totals.income}
        onChange={updateRow}
        onAdd={addRow}
        onRemove={removeRow}
        collapsed={!!collapsedMap.income}
        onToggle={() => toggle('income')}
      />

      <Section
        id="fixed"
        rows={state.fixed}
        meta={SECTION_META.fixed}
        total={totals.fixed}
        onChange={updateRow}
        onAdd={addRow}
        onRemove={removeRow}
        collapsed={!!collapsedMap.fixed}
        onToggle={() => toggle('fixed')}
      />

      <Section
        id="bills"
        rows={state.bills}
        meta={SECTION_META.bills}
        total={totals.bills}
        onChange={updateRow}
        onAdd={addRow}
        onRemove={removeRow}
        collapsed={!!collapsedMap.bills}
        onToggle={() => toggle('bills')}
      />

      {/* Shared / roommate expenses */}
      <div className="shared-card">
        <div className="shared-head">
          <span className="shared-icon"><Users size={16} strokeWidth={1.75} /></span>
          <div>
            <h2>Shared Household Expenses</h2>
            <p className="shared-hint">Groceries & shared costs split with roommates — settled at month end</p>
          </div>
        </div>
        <div className="shared-grid">
          <div className="shared-field">
            <label>Budgeted / expected</label>
            <div className="row-amount-wrap">
              <span className="row-currency">$</span>
              <input
                className="row-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={state.shared.expected}
                onChange={(e) => setState((p) => ({ ...p, shared: { ...p.shared, expected: e.target.value } }))}
              />
            </div>
          </div>
          <div className="shared-field">
            <label>Actual (from month-end update)</label>
            <div className="row-amount-wrap">
              <span className="row-currency">$</span>
              <input
                className="row-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={state.shared.actual}
                onChange={(e) => setState((p) => ({ ...p, shared: { ...p.shared, actual: e.target.value } }))}
              />
            </div>
          </div>
        </div>
        <textarea
          className="shared-note"
          rows={2}
          placeholder="Notes — e.g. what was covered, who paid first, anything to settle up"
          value={state.shared.note}
          onChange={(e) => setState((p) => ({ ...p, shared: { ...p.shared, note: e.target.value } }))}
        />
        {(sharedExpected > 0 || sharedActual > 0) && (
          <div className="shared-diff">
            {sharedDiff === 0 && <>Right on budget.</>}
            {sharedDiff > 0 && <>Came in <b>{fmt(sharedDiff)}</b> over what you expected.</>}
            {sharedDiff < 0 && <>Came in <b>{fmt(Math.abs(sharedDiff))}</b> under what you expected.</>}
          </div>
        )}
      </div>

      <Section
        id="discretionary"
        rows={state.discretionary}
        meta={SECTION_META.discretionary}
        total={totals.discretionary}
        onChange={updateRow}
        onAdd={addRow}
        onRemove={removeRow}
        collapsed={!!collapsedMap.discretionary}
        onToggle={() => toggle('discretionary')}
      />

      <Section
        id="savings"
        rows={state.savings}
        meta={SECTION_META.savings}
        total={totals.savings}
        onChange={updateRow}
        onAdd={addRow}
        onRemove={removeRow}
        collapsed={!!collapsedMap.savings}
        onToggle={() => toggle('savings')}
      />

      <Section
        id="debt"
        rows={state.debt}
        meta={SECTION_META.debt}
        total={totals.debt}
        onChange={updateRow}
        onAdd={addRow}
        onRemove={removeRow}
        collapsed={!!collapsedMap.debt}
        onToggle={() => toggle('debt')}
      />

      <footer>Numbers save automatically and stay here next time you open this.</footer>
    </div>
  );
}
