"use client";
import React, { useState, useMemo } from "react";

/* ─── Constants (FY 2025-26) ─────────────────────────────────────── */
const STD_NEW = 75_000;
const STD_OLD = 50_000;
const CESS = 0.04;
const CAP_80C        = 1_50_000;
const CAP_80CCD1B    = 50_000;
const CAP_80D_SELF   = 25_000;
const CAP_80D_SENIOR = 50_000;
const CAP_HOME_LOAN  = 2_00_000;
const NEW_REBATE_LIMIT = 12_00_000;
const OLD_REBATE_LIMIT = 5_00_000;
const OLD_REBATE_MAX   = 12_500;

const NEW_SLABS = [
  { upto: 4_00_000, rate: 0 },
  { upto: 8_00_000, rate: 0.05 },
  { upto: 12_00_000, rate: 0.10 },
  { upto: 16_00_000, rate: 0.15 },
  { upto: 20_00_000, rate: 0.20 },
  { upto: 24_00_000, rate: 0.25 },
  { upto: Infinity,  rate: 0.30 },
];

const OLD_SLABS = [
  { upto: 2_50_000, rate: 0 },
  { upto: 5_00_000, rate: 0.05 },
  { upto: 10_00_000, rate: 0.20 },
  { upto: Infinity,  rate: 0.30 },
];

/* ─── Helpers ────────────────────────────────────────────────────── */
const INR = (n: number) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");

function slabTax(income: number, slabs: typeof NEW_SLABS) {
  let tax = 0, prev = 0;
  for (const s of slabs) {
    if (income <= prev) break;
    tax += (Math.min(income, s.upto) - prev) * s.rate;
    prev = s.upto;
  }
  return Math.max(0, Math.round(tax));
}

function newTaxWithRebate(income: number) {
  if (income <= NEW_REBATE_LIMIT) return 0;
  const t = slabTax(income, NEW_SLABS);
  return Math.max(0, Math.min(t, income - NEW_REBATE_LIMIT));
}

function oldTaxWithRebate(income: number) {
  const t = slabTax(income, OLD_SLABS);
  return income <= OLD_REBATE_LIMIT ? Math.max(0, t - OLD_REBATE_MAX) : t;
}

function salaryBreakup(ctc: number) {
  const basic = Math.round(ctc * 0.4);
  const hra = Math.round(basic * 0.5);
  const employerPF = Math.round(basic * 0.12);
  const employeePF = Math.round(basic * 0.12);
  const lta = Math.round(ctc * 0.02);
  const specialAllowance = Math.max(0, ctc - basic - hra - employerPF - lta);
  return { basic, hra, employerPF, employeePF, lta, specialAllowance };
}

function hraExemption(hra: number, rent: number, basic: number, metro: boolean) {
  if (rent === 0) return 0;
  return Math.max(0, Math.round(Math.min(hra, Math.max(0, rent - basic * 0.1), (metro ? 0.5 : 0.4) * basic)));
}

/* ─── Core calculation ───────────────────────────────────────────── */
interface TaxInput {
  ctc: number; professionalTax: number;
  rentPaid: number; isMetro: boolean;
  section80C: number; section80CCD1B: number;
  section80DSelf: number; section80DParents: number; parentsAreSenior: boolean;
  homeLoanInterest: number; ltaClaimed: number;
}

function calculateTax(inp: TaxInput) {
  const { ctc, professionalTax, rentPaid, isMetro,
    section80C, section80CCD1B, section80DSelf, section80DParents,
    parentsAreSenior, homeLoanInterest, ltaClaimed } = inp;

  const b = salaryBreakup(ctc);
  const gross = Math.max(0, ctc - b.employerPF);

  // ── New regime ──
  const newTaxable = Math.max(0, gross - STD_NEW);
  const newTax  = newTaxWithRebate(newTaxable);
  const newCess = Math.round(newTax * CESS);
  const newTotal = newTax + newCess;

  // ── Old regime ──
  const hra   = hraExemption(b.hra, rentPaid, b.basic, isMetro);
  const c80C  = Math.min(CAP_80C, section80C + b.employeePF);
  const c80N  = Math.min(CAP_80CCD1B, section80CCD1B);
  const c80DS = Math.min(CAP_80D_SELF, section80DSelf);
  const c80DP = Math.min(parentsAreSenior ? CAP_80D_SENIOR : CAP_80D_SELF, section80DParents);
  const cHL   = Math.min(CAP_HOME_LOAN, homeLoanInterest);
  const oldDed = STD_OLD + professionalTax + hra + Math.min(b.lta, ltaClaimed) + c80C + c80N + c80DS + c80DP + cHL;
  const oldTaxable = Math.max(0, gross - oldDed);
  const oldTax  = oldTaxWithRebate(oldTaxable);
  const oldCess = Math.round(oldTax * CESS);
  const oldTotal = oldTax + oldCess;

  const recommended = oldTotal <= newTotal ? "old" : "new";

  return {
    gross, b, hra, c80C, c80N, c80DS, c80DP, cHL,
    new: { taxableIncome: newTaxable, totalTax: newTotal, takeHomeMonthly: Math.round((gross - newTotal) / 12) },
    old: { taxableIncome: oldTaxable, totalTax: oldTotal, takeHomeMonthly: Math.round((gross - oldTotal) / 12) },
    recommended, savings: Math.abs(oldTotal - newTotal),
  };
}

function suggestions(inp: TaxInput, res: ReturnType<typeof calculateTax>) {
  const tips: { title: string; detail: string }[] = [];

  const r80C = CAP_80C - res.c80C;
  if (r80C > 0) tips.push({
    title: `Use your remaining ${INR(r80C)} of Section 80C room`,
    detail: "ELSS, PPF, life insurance, tuition fees and home loan principal all count towards the ₹1,50,000 cap.",
  });
  const r80N = CAP_80CCD1B - res.c80N;
  if (r80N > 0) tips.push({
    title: `Claim up to ${INR(r80N)} more under 80CCD(1B)`,
    detail: "An additional NPS deduction that sits entirely outside the 80C limit.",
  });
  const r80D = CAP_80D_SELF - res.c80DS;
  if (r80D > 0) tips.push({
    title: `Health insurance premium of ${INR(r80D)} is still deductible under 80D`,
    detail: "Cover for yourself, spouse and children; a separate limit applies for parents (₹50,000 if senior citizens).",
  });
  if (res.hra === 0 && !inp.rentPaid) tips.push({
    title: "Enter your rent to check HRA exemption",
    detail: "HRA exemption is the lowest of: actual HRA, rent paid minus 10% of basic, and 50% (metro) / 40% (non-metro) of basic.",
  });
  const rHL = CAP_HOME_LOAN - res.cHL;
  if (rHL > 0) tips.push({
    title: `Home loan interest up to ${INR(rHL)} more qualifies under Section 24(b)`,
    detail: "Only applies to the old regime on a self-occupied property.",
  });
  tips.push({
    title: res.recommended === "old"
      ? `The old regime saves you ${INR(res.savings)}`
      : `The new regime saves you ${INR(res.savings)}`,
    detail: res.recommended === "old"
      ? "Your declared deductions outweigh the higher standard deduction and wider slabs of the new regime."
      : "Wider slabs plus the ₹75,000 standard deduction beat your current declared deductions.",
  });
  return tips;
}

/* ─── Input components ───────────────────────────────────────────── */
function NumField({ label, value, onChange, step = 1000 }: {
  label: string; value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      <input
        type="number" min={0} step={step} value={value}
        onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-brand-dark focus:outline-none focus:border-accent bg-white transition-colors"
      />
    </div>
  );
}

/* ─── Regime card ────────────────────────────────────────────────── */
function RegimeCard({ title, data, isRecommended }: {
  title: string;
  data: { taxableIncome: number; totalTax: number; takeHomeMonthly: number };
  isRecommended: boolean;
}) {
  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${isRecommended ? "border-accent" : "border-gray-100"}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${isRecommended ? "bg-accent" : "bg-gray-50"}`}>
        <span className={`font-bold text-sm ${isRecommended ? "text-white" : "text-brand-dark"}`}>{title}</span>
        {isRecommended && (
          <span className="text-[10px] font-bold bg-white text-accent px-2 py-0.5 rounded-full">Recommended ✓</span>
        )}
      </div>
      <div className="px-4 py-3 bg-white space-y-2">
        {[
          { label: "Taxable Income", value: INR(data.taxableIncome) },
          { label: "Tax + Cess",     value: INR(data.totalTax), color: data.totalTax > 0 ? "#dc2626" : "#16a34a" },
          { label: "Take-home / month", value: INR(data.takeHomeMonthly), bold: true },
        ].map(row => (
          <div key={row.label} className={`flex justify-between items-center ${row.bold ? "border-t pt-2 mt-2" : ""}`}>
            <span className="text-xs text-gray-500">{row.label}</span>
            <span className="font-bold text-sm" style={{ color: row.color ?? "#1a1a2e" }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main exported component ────────────────────────────────────── */
const DEFAULTS: TaxInput = {
  ctc: 12_00_000, professionalTax: 2_400,
  rentPaid: 0, isMetro: true,
  section80C: 0, section80CCD1B: 0,
  section80DSelf: 0, section80DParents: 0, parentsAreSenior: false,
  homeLoanInterest: 0, ltaClaimed: 0,
};

export function IncomeTaxCalculator() {
  const [form, setForm] = useState<TaxInput>(DEFAULTS);
  const set = (patch: Partial<TaxInput>) => setForm(prev => ({ ...prev, ...patch }));

  const result = useMemo(() => calculateTax(form), [form]);
  const tips    = useMemo(() => suggestions(form, result), [form, result]);

  return (
    <div className="space-y-6">
      {/* ── Inputs ── */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 space-y-5">

        {/* Salary */}
        <div>
          <h4 className="font-heading font-bold text-sm text-brand-dark mb-3 flex items-center gap-2">
            <span className="text-base">💼</span> Your Salary
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumField label="Annual CTC ₹" value={form.ctc} onChange={ctc => set({ ctc })} step={10000} />
            <NumField label="Professional Tax ₹" value={form.professionalTax} onChange={professionalTax => set({ professionalTax })} step={100} />
          </div>
          {/* Computed breakup */}
          <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Basic (40%)", value: INR(result.b.basic) },
              { label: "HRA (50% basic)", value: INR(result.b.hra) },
              { label: "Employer PF", value: INR(result.b.employerPF) },
              { label: "Gross Salary", value: INR(result.gross) },
            ].map(c => (
              <div key={c.label}>
                <p className="text-[10px] text-gray-400">{c.label}</p>
                <p className="font-bold text-xs text-brand-dark">{c.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* HRA & Rent */}
        <div>
          <h4 className="font-heading font-bold text-sm text-brand-dark mb-3 flex items-center gap-2">
            <span className="text-base">🏠</span> HRA & Rent <span className="text-[11px] font-normal text-gray-400">(Old Regime only)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumField label="Annual Rent Paid ₹" value={form.rentPaid} onChange={rentPaid => set({ rentPaid })} />
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">City</label>
              <select
                value={form.isMetro ? "metro" : "non-metro"}
                onChange={e => set({ isMetro: e.target.value === "metro" })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-brand-dark focus:outline-none focus:border-accent bg-white"
              >
                <option value="metro">Metro (Mumbai, Delhi, Kolkata, Chennai)</option>
                <option value="non-metro">Non-Metro</option>
              </select>
            </div>
          </div>
          {result.hra > 0 && (
            <p className="text-xs text-green-700 mt-2 font-semibold">✓ HRA Exemption: {INR(result.hra)}</p>
          )}
        </div>

        {/* Investments & Deductions */}
        <div>
          <h4 className="font-heading font-bold text-sm text-brand-dark mb-3 flex items-center gap-2">
            <span className="text-base">💰</span> Investments & Deductions <span className="text-[11px] font-normal text-gray-400">(Old Regime only)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumField label={`Section 80C ₹ (max ₹1,50,000 incl. PF)`} value={form.section80C} onChange={section80C => set({ section80C })} />
            <NumField label="80CCD(1B) / NPS ₹ (max ₹50,000)" value={form.section80CCD1B} onChange={section80CCD1B => set({ section80CCD1B })} />
            <NumField label="80D – Self & Family ₹ (max ₹25,000)" value={form.section80DSelf} onChange={section80DSelf => set({ section80DSelf })} step={500} />
            <NumField label="80D – Parents ₹" value={form.section80DParents} onChange={section80DParents => set({ section80DParents })} step={500} />
            <NumField label="Home Loan Interest 24(b) ₹ (max ₹2,00,000)" value={form.homeLoanInterest} onChange={homeLoanInterest => set({ homeLoanInterest })} />
            <NumField label="LTA Claimed ₹" value={form.ltaClaimed} onChange={ltaClaimed => set({ ltaClaimed })} />
          </div>
          <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox" checked={form.parentsAreSenior}
              onChange={e => set({ parentsAreSenior: e.target.checked })}
              className="w-4 h-4 accent-accent rounded"
            />
            <span className="text-sm text-gray-600 font-medium">Parents are senior citizens (80D limit ↑ ₹50,000)</span>
          </label>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RegimeCard title="Old Regime" data={result.old} isRecommended={result.recommended === "old"} />
        <RegimeCard title="New Regime" data={result.new} isRecommended={result.recommended === "new"} />
      </div>

      {/* ── Suggestions ── */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
        <h4 className="font-heading font-bold text-sm text-brand-dark mb-4 flex items-center gap-2">
          <span>💡</span> Suggestions to Reduce Tax
        </h4>
        <div className="space-y-4">
          {tips.map((tip, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent font-bold text-[11px]">{i + 1}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-dark leading-tight">{tip.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tip.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-center italic">
        ⚠️ Illustrative estimate based on published FY 2025-26 tax-slab figures. Not professional tax advice.
      </p>
    </div>
  );
}
