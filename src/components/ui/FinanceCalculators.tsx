"use client";
import React, { useState, useMemo } from "react";

/* ─── Helpers ────────────────────────────────────────────────────── */
const INR = (n: number) =>
  "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN");

interface Row {
  period: number;
  amount: number;
  cumulative: number;
  growth: number;
  growthTotal: number;
  balance: number;
}

/* ─── Calculation Engines ────────────────────────────────────────── */

/** SIP / RD — annuity-due, monthly compounding */
function calcSIP(P: number, rAnn: number, years: number) {
  const r = rAnn / 100 / 12;
  const rows: Row[] = [];
  let balance = 0, cumulative = 0, growthTotal = 0;
  for (let m = 1; m <= years * 12; m++) {
    const growth = (balance + P) * r;
    balance = (balance + P) * (1 + r);
    cumulative += P;
    growthTotal += growth;
    rows.push({ period: m, amount: P, cumulative, growth, growthTotal, balance });
  }
  const last = rows[rows.length - 1] ?? { balance: 0, cumulative: 0, growthTotal: 0 };
  return {
    corpus: last.balance, invested: last.cumulative,
    returns: last.balance - last.cumulative,
    monthly: rows,
    yearly: rows.filter(r => r.period % 12 === 0),
  };
}

/** Lumpsum — yearly compounding */
function calcLumpsum(P: number, rAnn: number, years: number) {
  const r = rAnn / 100;
  const rows: Row[] = [];
  let balance = P, growthTotal = 0;
  for (let y = 1; y <= years; y++) {
    const growth = balance * r;
    balance = balance * (1 + r);
    growthTotal += growth;
    rows.push({ period: y, amount: y === 1 ? P : 0, cumulative: P, growth, growthTotal, balance });
  }
  return { corpus: balance, invested: P, returns: balance - P, rows };
}

/** Step-Up SIP — monthly, step-up per year */
function calcStepSIP(P: number, rAnn: number, years: number, stepUp: number) {
  const r = rAnn / 100 / 12;
  const rows: Row[] = [];
  let balance = 0, cumulative = 0, growthTotal = 0;
  for (let y = 1; y <= years; y++) {
    const monthly = P * Math.pow(1 + stepUp / 100, y - 1);
    for (let m = 1; m <= 12; m++) {
      const growth = (balance + monthly) * r;
      balance = (balance + monthly) * (1 + r);
      cumulative += monthly;
      growthTotal += growth;
      rows.push({ period: (y - 1) * 12 + m, amount: monthly, cumulative, growth, growthTotal, balance });
    }
  }
  const regularSIP = calcSIP(P, rAnn, years);
  return {
    corpus: balance, invested: cumulative, returns: balance - cumulative,
    monthly: rows, yearly: rows.filter(r => r.period % 12 === 0),
    regularCorpus: regularSIP.corpus,
    extraGain: balance - regularSIP.corpus,
  };
}

/** SWP — systematic withdrawal */
function calcSWP(corpus: number, W: number, rAnn: number, maxYears: number) {
  const r = rAnn / 100 / 12;
  const rows: Row[] = [];
  let balance = corpus, totalWithdrawn = 0, growthTotal = 0;
  for (let m = 1; m <= maxYears * 12; m++) {
    const growth = balance * r;
    const newBal = balance + growth;
    const withdrawn = Math.min(W, newBal);
    balance = Math.max(0, newBal - withdrawn);
    totalWithdrawn += withdrawn;
    growthTotal += growth;
    rows.push({ period: m, amount: -withdrawn, cumulative: totalWithdrawn, growth, growthTotal, balance });
    if (balance <= 0) break;
  }
  const yearly: Row[] = [];
  for (let y = 1; y * 12 <= rows.length; y++) yearly.push(rows[y * 12 - 1]);
  if (rows.length % 12 !== 0 && rows.length > 0) yearly.push(rows[rows.length - 1]);
  return { corpus, totalWithdrawn, balanceLeft: balance, monthsRun: rows.length, monthly: rows, yearly };
}

/** NPS — SIP accumulation + annuity split */
function calcNPS(P: number, rAnn: number, years: number, annuityRate: number) {
  const sip = calcSIP(P, rAnn, years);
  const lumpsum60 = sip.corpus * 0.6;
  const monthlyPension = (sip.corpus * 0.4 * annuityRate / 100) / 12;
  return { ...sip, lumpsum60, monthlyPension };
}

/** PPF — yearly, start-of-year contribution */
function calcPPF(P: number, rAnn: number, years: number) {
  const r = rAnn / 100;
  const rows: Row[] = [];
  let balance = 0, cumulative = 0, growthTotal = 0;
  for (let y = 1; y <= years; y++) {
    const growth = (balance + P) * r;
    balance = (balance + P) * (1 + r);
    cumulative += P;
    growthTotal += growth;
    rows.push({ period: y, amount: P, cumulative, growth, growthTotal, balance });
  }
  return { corpus: balance, invested: cumulative, returns: balance - cumulative, rows };
}

/** EPF — 15.67% of basic (12% employee + 3.67% employer), monthly, annual step-up */
function calcEPF(basic: number, rAnn: number, years: number, stepUp: number) {
  const r = rAnn / 100 / 12;
  const EPF_RATE = 0.1567; // 12% + 3.67%
  const rows: Row[] = [];
  let balance = 0, cumulative = 0, growthTotal = 0;
  for (let y = 1; y <= years; y++) {
    const salary = basic * Math.pow(1 + stepUp / 100, y - 1);
    const P = salary * EPF_RATE;
    for (let m = 1; m <= 12; m++) {
      const growth = (balance + P) * r;
      balance = (balance + P) * (1 + r);
      cumulative += P;
      growthTotal += growth;
      rows.push({ period: (y - 1) * 12 + m, amount: P, cumulative, growth, growthTotal, balance });
    }
  }
  return {
    corpus: balance, invested: cumulative, returns: balance - cumulative,
    monthly: rows, yearly: rows.filter(r => r.period % 12 === 0),
  };
}

/** Loan (Home / Personal) — EMI with optional step-up and prepayment */
function calcLoan(principal: number, rAnn: number, years: number, extraYearly: number, stepUpPct: number) {
  const r = rAnn / 100 / 12;
  const n = years * 12;
  const baseEMI = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const rows: Row[] = [];
  let balance = principal, cumulative = 0, growthTotal = 0;
  for (let y = 1; y <= years && balance > 0.5; y++) {
    const emi = baseEMI * Math.pow(1 + stepUpPct / 100, y - 1);
    for (let m = 1; m <= 12 && balance > 0.5; m++) {
      const interest = balance * r;
      const principalPaid = Math.min(Math.max(0, emi - interest), balance);
      balance -= principalPaid;
      cumulative += principalPaid;
      growthTotal += interest;
      rows.push({
        period: (y - 1) * 12 + m, amount: principalPaid,
        cumulative, growth: interest, growthTotal, balance: Math.max(0, balance),
      });
    }
    // Extra prepayment at year-end
    if (balance > 0.5 && extraYearly > 0) {
      const prepay = Math.min(extraYearly, balance);
      balance -= prepay;
      cumulative += prepay;
      if (rows.length > 0) {
        const last = rows[rows.length - 1];
        last.amount += prepay;
        last.cumulative = cumulative;
        last.balance = Math.max(0, balance);
      }
    }
  }
  const yearly: Row[] = [];
  for (let y = 1; y * 12 <= rows.length; y++) yearly.push(rows[y * 12 - 1]);
  if (rows.length % 12 !== 0 && rows.length > 0) yearly.push(rows[rows.length - 1]);
  return { emi: baseEMI, principalRepaid: cumulative, totalInterest: growthTotal, totalPayment: cumulative + growthTotal, monthly: rows, yearly };
}

/** FD — quarterly compounding */
function calcFD(P: number, rAnn: number, years: number) {
  const rQ = rAnn / 100 / 4;
  const rows: Row[] = [];
  let growthTotal = 0;
  for (let y = 1; y <= years; y++) {
    const balPrev = P * Math.pow(1 + rQ, 4 * (y - 1));
    const balance = P * Math.pow(1 + rQ, 4 * y);
    const growth = balance - balPrev;
    growthTotal += growth;
    rows.push({ period: y, amount: y === 1 ? P : 0, cumulative: P, growth, growthTotal, balance });
  }
  const corpus = rows[rows.length - 1]?.balance ?? P;
  return { corpus, invested: P, returns: corpus - P, rows };
}

/* ─── UI Sub-components ──────────────────────────────────────────── */

function NumInput({ label, value, onChange, min = 0, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: number;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      <input
        type="number" value={value} min={min} step={step}
        onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) onChange(Math.max(min, v)); }}
        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-brand-dark focus:outline-none focus:border-accent bg-white transition-colors"
      />
    </div>
  );
}

function DonutChart({ invested, gains }: { invested: number; gains: number }) {
  const total = invested + Math.abs(gains);
  const pct = total > 0 ? Math.round((Math.abs(gains) / total) * 100) : 0;
  const r = 45, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = gains >= 0 ? "#22c55e" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#dbeafe" strokeWidth="18" />
          {pct > 0 && (
            <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="18"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="butt"
              transform="rotate(-90 60 60)" />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-lg leading-tight" style={{ color: "#1a1a2e" }}>{pct}%</span>
          <span className="text-[10px] text-gray-400">{gains >= 0 ? "returns" : "loss"}</span>
        </div>
      </div>
      <div className="flex gap-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-200 inline-block" />Invested
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
          {gains >= 0 ? "Returns" : "Loss"}
        </span>
      </div>
    </div>
  );
}

function SummaryCards({ cards }: { cards: { label: string; value: string; sub?: string; color?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
      {cards.map(c => (
        <div key={c.label} className="bg-white border-2 border-gray-100 rounded-2xl px-4 py-3">
          <p className="text-[11px] text-gray-400 mb-0.5">{c.label}</p>
          <p className="font-bold text-base leading-tight" style={{ color: c.color ?? "#1a1a2e" }}>{c.value}</p>
          {c.sub && <p className="text-[10px] text-gray-400 mt-0.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function ScheduleTable({
  rows, showToggle = false, isMonthly = false, onToggle,
  amtLabel = "Amount", growthLabel = "Growth", colLabel,
}: {
  rows: Row[]; showToggle?: boolean; isMonthly?: boolean; onToggle?: () => void;
  amtLabel?: string; growthLabel?: string; colLabel?: string;
}) {
  const periodLabel = colLabel ?? (isMonthly ? "Month" : "Year");
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-heading font-bold text-sm text-brand-dark">Schedule</h4>
        {showToggle && (
          <div className="flex rounded-xl overflow-hidden border-2 border-gray-200 text-xs font-bold">
            <button onClick={() => isMonthly && onToggle?.()}
              className="px-3 py-1.5 transition-colors"
              style={{ background: !isMonthly ? "#1a1a2e" : "transparent", color: !isMonthly ? "#fff" : "#9ca3af" }}>
              Yearly
            </button>
            <button onClick={() => !isMonthly && onToggle?.()}
              className="px-3 py-1.5 transition-colors"
              style={{ background: isMonthly ? "#1a1a2e" : "transparent", color: isMonthly ? "#fff" : "#9ca3af" }}>
              Monthly
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "2px solid #f0f0f0" }}>
              {[periodLabel, amtLabel, "Cumulative", growthLabel, `${growthLabel} Total`, "Balance"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-400 last:text-right first:text-left [&:not(:first-child)]:text-right">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                <td className="px-3 py-2 text-gray-600 font-medium">{row.period}</td>
                <td className="px-3 py-2 text-right text-gray-600">{INR(Math.abs(row.amount))}</td>
                <td className="px-3 py-2 text-right text-gray-600">{INR(row.cumulative)}</td>
                <td className="px-3 py-2 text-right text-emerald-600 font-medium">{INR(row.growth)}</td>
                <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{INR(row.growthTotal)}</td>
                <td className="px-3 py-2 text-right font-bold text-brand-dark">{INR(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 italic">
        ⚠️ Illustrative projections based on the rates you entered. Actual returns vary; not financial advice.
      </p>
    </div>
  );
}

/* ─── Calculator Panels ──────────────────────────────────────────── */

function SIPPanel() {
  const [P, setP] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [monthly, setMonthly] = useState(false);
  const r = useMemo(() => calcSIP(P, rate, years), [P, rate, years]);
  const rows = monthly ? r.monthly : r.yearly;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Monthly Investment ₹" value={P} onChange={setP} min={100} step={500} />
          <NumInput label="Expected Return % p.a." value={rate} onChange={setRate} min={1} step={0.5} />
          <NumInput label="Duration (years)" value={years} onChange={setYears} min={1} step={1} />
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.invested} gains={r.returns} />
        </div>
      </div>
      <SummaryCards cards={[
        { label: "Total Invested", value: INR(r.invested) },
        { label: "Estimated Returns", value: INR(r.returns), color: "#16a34a" },
        { label: "Total Value", value: INR(r.corpus), color: "#7c3aed" },
      ]} />
      <ScheduleTable rows={rows} showToggle colLabel={monthly ? "Month" : "Month (Year End)"}
        isMonthly={monthly} onToggle={() => setMonthly(m => !m)} />
    </>
  );
}

function LumpsumPanel() {
  const [P, setP] = useState(500000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const r = useMemo(() => calcLumpsum(P, rate, years), [P, rate, years]);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Investment Amount ₹" value={P} onChange={setP} min={1000} step={10000} />
          <NumInput label="Expected Return % p.a." value={rate} onChange={setRate} min={1} step={0.5} />
          <NumInput label="Duration (years)" value={years} onChange={setYears} min={1} step={1} />
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.invested} gains={r.returns} />
        </div>
      </div>
      <SummaryCards cards={[
        { label: "Total Invested", value: INR(r.invested) },
        { label: "Estimated Returns", value: INR(r.returns), color: "#16a34a" },
        { label: "Total Value", value: INR(r.corpus), color: "#7c3aed" },
      ]} />
      <ScheduleTable rows={r.rows} colLabel="Year" />
    </>
  );
}

function StepSIPPanel() {
  const [P, setP] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [stepUp, setStepUp] = useState(10);
  const [monthly, setMonthly] = useState(false);
  const r = useMemo(() => calcStepSIP(P, rate, years, stepUp), [P, rate, years, stepUp]);
  const rows = monthly ? r.monthly : r.yearly;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Monthly Investment ₹" value={P} onChange={setP} min={100} step={500} />
          <NumInput label="Expected Return % p.a." value={rate} onChange={setRate} min={1} step={0.5} />
          <NumInput label="Duration (years)" value={years} onChange={setYears} min={1} step={1} />
          <NumInput label="Annual Step-Up %" value={stepUp} onChange={setStepUp} min={0} step={1} />
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.invested} gains={r.returns} />
        </div>
      </div>
      <SummaryCards cards={[
        { label: "Total Invested", value: INR(r.invested) },
        { label: "Estimated Returns", value: INR(r.returns), color: "#16a34a" },
        { label: "Total Value", value: INR(r.corpus), color: "#7c3aed" },
      ]} />
      {/* Comparison */}
      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <p className="text-xs font-semibold text-amber-700 mb-3">With vs. Without Step-Up</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
            <p className="text-[10px] text-gray-400">Regular SIP</p>
            <p className="font-bold text-brand-dark">{INR(r.regularCorpus)}</p>
          </div>
          <div className="bg-accent/10 rounded-xl p-3 text-center border border-accent/20">
            <p className="text-[10px] text-gray-400">Step-Up SIP</p>
            <p className="font-bold text-accent">{INR(r.corpus)}</p>
          </div>
        </div>
        {r.extraGain > 0 && (
          <p className="text-xs text-amber-700 font-semibold mt-2 text-center">
            🚀 Step-up adds <strong>{INR(r.extraGain)}</strong> to your final corpus!
          </p>
        )}
      </div>
      <ScheduleTable rows={rows} showToggle colLabel={monthly ? "Month" : "Month (Year End)"}
        isMonthly={monthly} onToggle={() => setMonthly(m => !m)} />
    </>
  );
}

function SWPPanel() {
  const [corpus, setCorpus] = useState(500000);
  const [W, setW] = useState(20000);
  const [rate, setRate] = useState(12);
  const [maxYears, setMaxYears] = useState(5);
  const [monthly, setMonthly] = useState(false);
  const r = useMemo(() => calcSWP(corpus, W, rate, maxYears), [corpus, W, rate, maxYears]);
  const rows = monthly ? r.monthly : r.yearly;
  const depleted = r.balanceLeft <= 0;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Investment Amount ₹" value={corpus} onChange={setCorpus} min={10000} step={10000} />
          <NumInput label="Monthly Withdrawal ₹" value={W} onChange={setW} min={100} step={500} />
          <NumInput label="Expected Return % p.a." value={rate} onChange={setRate} min={0} step={0.5} />
          <NumInput label="Max Duration (years)" value={maxYears} onChange={setMaxYears} min={1} step={1} />
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.totalWithdrawn} gains={r.totalWithdrawn - corpus} />
        </div>
      </div>
      <SummaryCards cards={[
        { label: "Starting Corpus", value: INR(corpus) },
        { label: "Total Withdrawn", value: INR(r.totalWithdrawn), color: "#16a34a" },
        { label: "Balance Left", value: INR(r.balanceLeft), color: depleted ? "#dc2626" : "#7c3aed" },
        { label: "Months Sustained", value: `${r.monthsRun}${depleted ? " (depleted)" : ""}`, color: depleted ? "#dc2626" : "#1a1a2e" },
      ]} />
      <ScheduleTable rows={rows} showToggle colLabel={monthly ? "Month" : "Month (Year End)"}
        isMonthly={monthly} onToggle={() => setMonthly(m => !m)}
        amtLabel="Withdrawal" growthLabel="Interest" />
    </>
  );
}

function NPSPanel() {
  const [P, setP] = useState(10000);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(25);
  const [annuityRate, setAnnuityRate] = useState(6);
  const [monthly, setMonthly] = useState(false);
  const r = useMemo(() => calcNPS(P, rate, years, annuityRate), [P, rate, years, annuityRate]);
  const rows = monthly ? r.monthly : r.yearly;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Monthly Investment ₹" value={P} onChange={setP} min={500} step={500} />
          <NumInput label="Expected Return % p.a." value={rate} onChange={setRate} min={1} step={0.5} />
          <NumInput label="Duration (years)" value={years} onChange={setYears} min={1} step={1} />
          <NumInput label="Annuity Rate % p.a." value={annuityRate} onChange={setAnnuityRate} min={1} step={0.5} />
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.invested} gains={r.returns} />
        </div>
      </div>
      <SummaryCards cards={[
        { label: "Total Invested", value: INR(r.invested) },
        { label: "Corpus at Maturity", value: INR(r.corpus), color: "#7c3aed" },
        { label: "Lumpsum (60%)", value: INR(r.lumpsum60), color: "#16a34a" },
        { label: "Monthly Pension", value: INR(r.monthlyPension) + "/mo", color: "#ea580c" },
      ]} />
      <ScheduleTable rows={rows} showToggle colLabel={monthly ? "Month" : "Month (Year End)"}
        isMonthly={monthly} onToggle={() => setMonthly(m => !m)} />
    </>
  );
}

function PPFPanel() {
  const [P, setP] = useState(150000);
  const [rate, setRate] = useState(7.1);
  const [years, setYears] = useState(15);
  const r = useMemo(() => calcPPF(P, rate, years), [P, rate, years]);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Yearly Investment ₹" value={P} onChange={setP} min={500} step={5000} />
          <NumInput label="Expected Return % p.a." value={rate} onChange={setRate} min={1} step={0.1} />
          <NumInput label="Duration (years)" value={years} onChange={setYears} min={1} step={1} />
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.invested} gains={r.returns} />
        </div>
      </div>
      <SummaryCards cards={[
        { label: "Total Invested", value: INR(r.invested) },
        { label: "Estimated Returns", value: INR(r.returns), color: "#16a34a" },
        { label: "Total Value", value: INR(r.corpus), color: "#7c3aed" },
      ]} />
      <ScheduleTable rows={r.rows} colLabel="Year" />
    </>
  );
}

function EPFPanel() {
  const [basic, setBasic] = useState(30000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(25);
  const [stepUp, setStepUp] = useState(5);
  const [monthly, setMonthly] = useState(false);
  const r = useMemo(() => calcEPF(basic, rate, years, stepUp), [basic, rate, years, stepUp]);
  const rows = monthly ? r.monthly : r.yearly;
  const monthlyContrib = basic * 0.1567;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Monthly Basic Salary ₹" value={basic} onChange={setBasic} min={5000} step={1000} />
          <NumInput label="Expected Return % p.a." value={rate} onChange={setRate} min={1} step={0.1} />
          <NumInput label="Duration (years)" value={years} onChange={setYears} min={1} step={1} />
          <NumInput label="Annual Salary Step-Up %" value={stepUp} onChange={setStepUp} min={0} step={1} />
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.invested} gains={r.returns} />
        </div>
      </div>
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700">
        💡 EPF contribution: <strong>12%</strong> (employee) + <strong>3.67%</strong> (employer) = <strong>15.67%</strong> of basic.
        Monthly contribution at current salary: <strong>{INR(monthlyContrib)}</strong>
      </div>
      <SummaryCards cards={[
        { label: "Total Invested", value: INR(r.invested) },
        { label: "Estimated Returns", value: INR(r.returns), color: "#16a34a" },
        { label: "Total Corpus", value: INR(r.corpus), color: "#7c3aed" },
      ]} />
      <ScheduleTable rows={rows} showToggle colLabel={monthly ? "Month" : "Month (Year End)"}
        isMonthly={monthly} onToggle={() => setMonthly(m => !m)} />
    </>
  );
}

function LoanPanel({ isHome }: { isHome: boolean }) {
  const [principal, setPrincipal] = useState(isHome ? 3000000 : 500000);
  const [rate, setRate] = useState(isHome ? 8.5 : 12);
  const [years, setYears] = useState(isHome ? 20 : 5);
  const [extra, setExtra] = useState(0);
  const [stepUp, setStepUp] = useState(isHome ? 5 : 0);
  const [monthly, setMonthly] = useState(false);
  const r = useMemo(() => calcLoan(principal, rate, years, extra, stepUp), [principal, rate, years, extra, stepUp]);
  const rows = monthly ? r.monthly : r.yearly;
  const interestPct = r.totalPayment > 0 ? Math.round((r.totalInterest / r.totalPayment) * 100) : 0;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Loan Amount ₹" value={principal} onChange={setPrincipal} min={10000} step={10000} />
          <NumInput label="Interest Rate % p.a." value={rate} onChange={setRate} min={1} step={0.25} />
          <NumInput label="Duration (years)" value={years} onChange={setYears} min={1} step={1} />
          <NumInput label="Extra Yearly Prepayment ₹" value={extra} onChange={setExtra} min={0} step={1000} />
          {isHome && <NumInput label="Annual EMI Step-Up %" value={stepUp} onChange={setStepUp} min={0} step={1} />}
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.principalRepaid} gains={-r.totalInterest} />
        </div>
      </div>
      <SummaryCards cards={[
        { label: "Monthly EMI", value: INR(r.emi) + "/mo", color: "#7c3aed" },
        { label: "Principal Repaid", value: INR(r.principalRepaid) },
        { label: "Total Interest", value: INR(r.totalInterest), color: "#dc2626" },
        { label: "Total Payment", value: INR(r.totalPayment), color: "#1a1a2e" },
      ]} />
      <ScheduleTable rows={rows} showToggle colLabel={monthly ? "Month" : "Month (Year End)"}
        isMonthly={monthly} onToggle={() => setMonthly(m => !m)}
        amtLabel="Principal Paid" growthLabel="Interest" />
    </>
  );
}

function FDPanel() {
  const [P, setP] = useState(500000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(5);
  const r = useMemo(() => calcFD(P, rate, years), [P, rate, years]);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Investment Amount ₹" value={P} onChange={setP} min={1000} step={10000} />
          <NumInput label="Expected Return % p.a." value={rate} onChange={setRate} min={1} step={0.25} />
          <NumInput label="Duration (years)" value={years} onChange={setYears} min={1} step={1} />
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.invested} gains={r.returns} />
        </div>
      </div>
      <div className="mt-4 bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-xs text-green-700">
        💡 FD interest is compounded <strong>quarterly</strong> in this calculation.
      </div>
      <SummaryCards cards={[
        { label: "Total Invested", value: INR(r.invested) },
        { label: "Estimated Returns", value: INR(r.returns), color: "#16a34a" },
        { label: "Maturity Value", value: INR(r.corpus), color: "#7c3aed" },
      ]} />
      <ScheduleTable rows={r.rows} colLabel="Year" />
    </>
  );
}

function RDPanel() {
  const [P, setP] = useState(5000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(5);
  const [monthly, setMonthly] = useState(false);
  // RD uses same formula as SIP (monthly annuity-due)
  const r = useMemo(() => calcSIP(P, rate, years), [P, rate, years]);
  const rows = monthly ? r.monthly : r.yearly;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <NumInput label="Monthly Investment ₹" value={P} onChange={setP} min={100} step={500} />
          <NumInput label="Expected Return % p.a." value={rate} onChange={setRate} min={1} step={0.25} />
          <NumInput label="Duration (years)" value={years} onChange={setYears} min={1} step={1} />
        </div>
        <div className="flex items-center justify-center">
          <DonutChart invested={r.invested} gains={r.returns} />
        </div>
      </div>
      <SummaryCards cards={[
        { label: "Total Invested", value: INR(r.invested) },
        { label: "Estimated Returns", value: INR(r.returns), color: "#16a34a" },
        { label: "Maturity Value", value: INR(r.corpus), color: "#7c3aed" },
      ]} />
      <ScheduleTable rows={rows} showToggle colLabel={monthly ? "Month" : "Month (Year End)"}
        isMonthly={monthly} onToggle={() => setMonthly(m => !m)} />
    </>
  );
}

/* ─── Calculator Metadata ────────────────────────────────────────── */
const CALCS = [
  { id: "sip",           label: "SIP",             emoji: "📈", desc: "Systematic Investment Plan" },
  { id: "lumpsum",       label: "Lumpsum",          emoji: "💰", desc: "One-time Investment" },
  { id: "step_sip",      label: "Step-Up SIP",      emoji: "🪜", desc: "SIP with Annual Increase" },
  { id: "swp",           label: "SWP",              emoji: "🏧", desc: "Systematic Withdrawal Plan" },
  { id: "nps",           label: "NPS",              emoji: "🏛️", desc: "National Pension System" },
  { id: "ppf",           label: "PPF",              emoji: "🔒", desc: "Public Provident Fund" },
  { id: "epf",           label: "EPF",              emoji: "👔", desc: "Employee Provident Fund" },
  { id: "home_loan",     label: "Home Loan / EMI",  emoji: "🏠", desc: "Home Loan EMI Calculator" },
  { id: "personal_loan", label: "Personal Loan",    emoji: "💳", desc: "Personal Loan EMI" },
  { id: "fd",            label: "FD",               emoji: "🏦", desc: "Fixed Deposit" },
  { id: "rd",            label: "RD",               emoji: "🗓️", desc: "Recurring Deposit" },
] as const;

type CalcId = typeof CALCS[number]["id"];

/* ─── Main Export ────────────────────────────────────────────────── */
export function FinanceCalculators({ activeCalcProp, hideTabBar }: { activeCalcProp?: string; hideTabBar?: boolean } = {}) {
  const toCalcId = (s?: string): CalcId => {
    const map: Record<string, CalcId> = {
      sip: "sip", lumpsum: "lumpsum", step_sip: "step_sip", stepsip: "step_sip",
      swp: "swp", nps: "nps", ppf: "ppf", epf: "epf",
      home_loan: "home_loan", homeloan: "home_loan",
      personal_loan: "personal_loan", personalloan: "personal_loan",
      fd: "fd", rd: "rd",
    };
    return map[s ?? ""] ?? "sip";
  };
  const [active, setActive] = useState<CalcId>(() => toCalcId(activeCalcProp));

  // Sync when prop changes (e.g. URL param changes)
  React.useEffect(() => {
    if (activeCalcProp) setActive(toCalcId(activeCalcProp));
  }, [activeCalcProp]);
  const calc = CALCS.find(c => c.id === active)!;

  const panel: Record<CalcId, React.ReactNode> = {
    sip:           <SIPPanel />,
    lumpsum:       <LumpsumPanel />,
    step_sip:      <StepSIPPanel />,
    swp:           <SWPPanel />,
    nps:           <NPSPanel />,
    ppf:           <PPFPanel />,
    epf:           <EPFPanel />,
    home_loan:     <LoanPanel isHome={true} />,
    personal_loan: <LoanPanel isHome={false} />,
    fd:            <FDPanel />,
    rd:            <RDPanel />,
  };

  return (
    <div>
      {/* ── Tab bar (hidden when controlled externally via SubHeader) ── */}
      {!hideTabBar && (
        <div className="overflow-x-auto -mx-1 px-1 pb-3 mb-4">
          <div className="flex gap-2 min-w-max">
            {CALCS.map(c => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border-2 transition-all"
                style={active === c.id
                  ? { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" }
                  : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Active calculator card ── */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-xl flex-shrink-0">
            {calc.emoji}
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-brand-dark leading-tight">{calc.label}</h3>
            <p className="text-xs text-gray-400">{calc.desc}</p>
          </div>
        </div>

        {/* Panel */}
        {panel[active]}
      </div>
    </div>
  );
}
