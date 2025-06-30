import React from "react";

type NumberSelectProps = {
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step: number;
};

function NumberSelect({ value, setValue, min, max, step }: NumberSelectProps) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => setValue(Number(e.target.value))}
      className="w-20 bg-white/20 text-white rounded px-2 py-1 border border-white/30"
    />
  );
}

export default NumberSelect;