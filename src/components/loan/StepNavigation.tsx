"use client";

import { Check, ChevronDown } from "lucide-react";
import { STEPS } from "@/types/loan";

type Props = {
  step: number;
  maxVisitedStep: number;
  onStepChange: (step: number) => void;
  locked?: boolean;
};

export function StepNavigation({
  step,
  maxVisitedStep,
  onStepChange,
  locked = false,
}: Props) {
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <nav className="wizard-navigation" aria-label="Application progress">
      <div className="wizard-progress-info">
        <span>
          Step {step + 1} of {STEPS.length}
        </span>
        <strong>{progress}%</strong>
      </div>

      <div
        className="wizard-progress-track"
        role="progressbar"
        aria-label="Application progress"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="wizard-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="wizard-mobile-select">
        <label htmlFor="wizard-step-select">Navigate application</label>
        <div className="wizard-select-wrap">
          <select
            id="wizard-step-select"
            value={step}
            disabled={locked}
            onChange={(event) => onStepChange(Number(event.target.value))}
          >
            {STEPS.map((name, index) => (
              <option
                key={name}
                value={index}
                disabled={index > maxVisitedStep}
              >
                {index + 1}. {name}
              </option>
            ))}
          </select>
          <ChevronDown size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="wizard-steps">
        {STEPS.map((name, index) => {
          const active = index === step;
          const complete = index < step;
          const accessible = !locked && index <= maxVisitedStep;

          return (
            <button
              key={name}
              type="button"
              disabled={!accessible}
              aria-current={active ? "step" : undefined}
              className={[
                "wizard-step",
                active ? "is-active" : "",
                complete ? "is-complete" : "",
              ].join(" ")}
              onClick={() => onStepChange(index)}
            >
              <span className="wizard-step-number">
                {complete ? <Check size={15} aria-hidden="true" /> : index + 1}
              </span>

              <span className="wizard-step-name">{name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
