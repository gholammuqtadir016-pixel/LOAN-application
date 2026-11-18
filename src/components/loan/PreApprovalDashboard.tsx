"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Info,
  TrendingUp,
} from "lucide-react";
import type { LoanData, PreApproval } from "@/types/loan";
import { money } from "@/lib/loan";

type Props = {
  data: LoanData;
  assessment: PreApproval;
  submitted: boolean;
  applicationId: string;
};

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="p5-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function PreApprovalDashboard({
  data,
  assessment,
  submitted,
  applicationId,
}: Props) {
  const maximum = Math.max(0, assessment.maxSuggestedEmi);
  const ratio = maximum > 0 ? assessment.estimatedEmi / maximum : 0;
  const percent = Math.max(0, Math.min(100, ratio * 100));

  const showSuccess = submitted && assessment.eligible;
  const heading = submitted
    ? showSuccess
      ? "Demo criteria met"
      : "Additional review suggested"
    : "Illustrative loan estimate";

  return (
    <div className="p5-stack">
      <div
        className={`p5-outcome ${showSuccess ? "p5-outcome--positive" : ""}`}
      >
        <span className="p5-outcome-icon">
          {showSuccess ? <CheckCircle2 size={26} /> : <TrendingUp size={26} />}
        </span>
        <span className="p5-eyebrow">
          {submitted ? "APPLICATION SUBMITTED" : "ESTIMATE ONLY"}
        </span>
        <h3>{heading}</h3>
        <p>
          {submitted
            ? "Your demo submission was recorded. This result is not an actual credit decision."
            : "Based on the information entered so far. Submit the complete form to record a demo assessment."}
        </p>
        <div className="p5-outcome-meta">
          <span>{data.loanType} LOAN</span>
          <span>{money(Number(data.amount))} requested</span>
        </div>
      </div>

      <div className="p5-stats" aria-label="Loan estimate metrics">
        <Stat
          label="Estimated monthly EMI"
          value={money(assessment.estimatedEmi)}
          detail="Indicative repayment"
        />
        <Stat
          label="Illustrative annual rate"
          value={`${assessment.interestRate}%`}
          detail="Not a lender quote"
        />
        <Stat
          label="Monthly surplus"
          value={money(assessment.monthlySurplus)}
          detail="After listed expenses and EMIs"
        />
        <Stat
          label="Suggested EMI limit"
          value={money(maximum)}
          detail="Based on demo criteria"
        />
      </div>

      <section className="p5-insight" aria-labelledby="p5-insight-title">
        <div className="p5-section-heading">
          <h4 id="p5-insight-title">Repayment affordability</h4>
          <span>
            {maximum > 0
              ? `${Math.round(ratio * 100)}% of suggested limit`
              : "No suggested EMI capacity"}
          </span>
        </div>
        <div
          className="p5-meter"
          role="progressbar"
          aria-label="EMI relative to suggested limit"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div className="p5-meter-fill" style={{ width: `${percent}%` }} />
        </div>
        <p>
          Estimated EMI {money(assessment.estimatedEmi)} compared with a
          suggested limit of {money(maximum)}.
        </p>
        {ratio > 1 && (
          <p className="p5-warning">
            <AlertCircle size={16} /> The estimated EMI is above the
            illustrative limit.
          </p>
        )}
      </section>

      <section className="p5-insight" aria-labelledby="p5-reasons-title">
        <h4 id="p5-reasons-title">Assessment explanation</h4>
        {assessment.reasons.length ? (
          <ul className="p5-reasons">
            {assessment.reasons.map((reason, index) => (
              <li key={`${index}-${reason}`}>
                <AlertCircle size={17} />
                {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="p5-good">
            <CheckCircle2 size={17} /> No concerns were flagged by the demo
            calculation.
          </p>
        )}
      </section>

      {submitted && (
        <div className="p5-submitted">
          <FileCheck2 size={20} />
          <div>
            <strong>Demo application recorded</strong>
            <small>Reference: {applicationId}</small>
          </div>
        </div>
      )}

      <p className="p5-disclaimer">
        <Info size={18} aria-hidden="true" /> Simulation only. No lender, credit
        bureau, PAN or Aadhaar service has been contacted. This is not
        pre-approval, a loan offer, or a guarantee of eligibility.
      </p>
    </div>
  );
}
