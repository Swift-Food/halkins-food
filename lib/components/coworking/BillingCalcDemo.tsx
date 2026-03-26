"use client";

import { useEffect, useRef, useState } from "react";

function rawRounded(n: number) {
  return Math.floor(n / 250) * 250;
}

function finalFee(n: number) {
  return Math.max(250, rawRounded(n));
}

const examples = [180, 480, 1400];

interface RowProps {
  label: string;
  value: string;
  visible: boolean;
  accent?: boolean;
  bold?: boolean;
}

function Row({ label, value, visible, accent = false, bold = false }: RowProps) {
  return (
    <div
      className={`flex items-center justify-between transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
    >
      <span
        className={`text-[10px] tracking-widest ${
          accent ? "text-primary" : "text-slate-400"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-medium ${
          bold ? "text-base text-primary" : `text-sm ${accent ? "text-primary" : "text-slate-700"}`
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function BillingCalcDemo() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [isManual, setIsManual] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const catering = examples[exampleIndex % examples.length];
  const rounded = rawRounded(catering);
  const fee = finalFee(catering);
  const minimumApplies = rounded < 250;

  const runAnimation = () => {
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 950);
    const t3 = setTimeout(() => setPhase(3), 1700);
    const t4 = setTimeout(() => setPhase(4), 2500);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  };

  useEffect(() => {
    const cleanup = runAnimation();
    if (isManual) return cleanup;

    const tNext = setTimeout(() => {
      setExampleIndex((p) => (p + 1) % examples.length);
    }, 7000);

    return () => {
      cleanup();
      clearTimeout(tNext);
    };
  }, [exampleIndex, isManual]);

  const handleSelect = (index: number) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setIsManual(true);
    setExampleIndex(index);
    resumeTimerRef.current = setTimeout(() => setIsManual(false), 5000);
  };

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  return (
    <div className="w-full rounded-[1.25rem] border border-slate-200/80 bg-slate-50/70 p-5 font-mono">
      <div className="flex items-center justify-between mb-5">
        <div className="text-xs tracking-[0.2em] text-slate-600 font-semibold">
          VENUE HIRE CALCULATION
        </div>
        <div className="flex gap-1.5">
          {examples.map((amount, index) => (
            <button
              key={amount}
              type="button"
              onClick={() => handleSelect(index)}
              className={`rounded-full px-2.5 py-1 text-[10px] tracking-wide transition-all duration-200 ${
                exampleIndex === index
                  ? "bg-primary text-white"
                  : "bg-slate-200 text-slate-500 hover:bg-slate-300"
              }`}
            >
              £{amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {/* Step 1: catering spend */}
        <Row
          label="CATERING SPEND"
          value={`£${catering.toLocaleString()}`}
          visible={phase >= 1}
        />

        {/* Step 2: 1:1 ratio */}
        <Row
          label="VENUE HIRE  1:1"
          value={`£${catering.toLocaleString()}`}
          visible={phase >= 2}
        />

        {/* Step 3: round down */}
        <div className={`transition-all duration-500 ${phase >= 3 ? "opacity-100" : "opacity-0"}`}>
          <div className="h-px bg-slate-200 my-3" />
          <Row
            label="ROUND DOWN → NEAREST £250"
            value={`£${rounded.toLocaleString()}`}
            visible={phase >= 3}
            accent
          />
        </div>

        {/* Step 4: apply minimum / final fee */}
        <div className={`transition-all duration-500 ${phase >= 4 ? "opacity-100" : "opacity-0"}`}>
          {minimumApplies && (
            <div className="h-px bg-slate-200 my-3" />
          )}
          <Row
            label={minimumApplies ? "MINIMUM £250 APPLIED" : "VENUE HIRE FEE"}
            value={`£${fee.toLocaleString()}`}
            visible={phase >= 4}
            accent={!minimumApplies}
            bold
          />
        </div>
      </div>
    </div>
  );
}
