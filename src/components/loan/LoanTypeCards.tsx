"use client";

import {
  UserRound,
  House,
  BriefcaseBusiness,
  CircleCheck,
  Circle,
} from "lucide-react";

import type { LoanType } from "@/types/loan";

type LoanTypeCardsProps = {
  value: LoanType;
  onChange: (value: LoanType) => void;
};

const loanTypes = [
  {
    id: "PERSONAL",
    title: "Personal Loan",
    description: "For education, travel, medical needs and expenses.",
    icon: UserRound,
  },
  {
    id: "HOME",
    title: "Home Loan",
    description: "For buying, building or renovating your dream home.",
    icon: House,
  },
  {
    id: "BUSINESS",
    title: "Business Loan",
    description: "For working capital, equipment and business growth.",
    icon: BriefcaseBusiness,
  },
] as const;

export function LoanTypeCards({ value, onChange }: LoanTypeCardsProps) {
  return (
    <div className="loan-selection">
      <h3 className="loan-selection-title">What type of loan do you need?</h3>

      <p className="loan-selection-description">
        Select the loan that best matches your needs.
      </p>

      <div className="loan-card-grid">
        {loanTypes.map((loan) => {
          const Icon = loan.icon;
          const selected = value === loan.id;

          return (
            <button
              key={loan.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(loan.id)}
              className={`loan-type-card ${selected ? "selected" : ""}`}
            >
              <div className="loan-card-top">
                <span className="loan-card-icon">
                  <Icon size={25} />
                </span>

                {selected ? (
                  <CircleCheck size={22} className="loan-card-check" />
                ) : (
                  <Circle size={22} className="loan-card-unchecked" />
                )}
              </div>

              <div className="loan-card-content">
                <h4>{loan.title}</h4>
                <p>{loan.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="loan-selection-hint">
        Your application requirements will update automatically based on your
        selection.
      </p>
    </div>
  );
}
