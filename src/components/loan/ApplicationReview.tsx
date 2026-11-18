"use client";

import {
  BadgeCheck,
  BriefcaseBusiness,
  FileCheck2,
  Home,
  UserRound,
} from "lucide-react";
import type { LoanData } from "@/types/loan";
import { money } from "@/lib/loan";

type Props = { data: LoanData };

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="p5-review-item">
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}

export function ApplicationReview({ data }: Props) {
  const requiredDocuments = [
    "identity",
    "income",
    ...(data.loanType === "HOME" ? ["property"] : []),
    ...(data.loanType === "BUSINESS" ? ["business"] : []),
  ];

  const documentsUploaded = requiredDocuments.filter((kind) =>
    Boolean(data.documentIds[kind]),
  ).length;

  const LoanIcon =
    data.loanType === "HOME"
      ? Home
      : data.loanType === "BUSINESS"
        ? BriefcaseBusiness
        : UserRound;

  return (
    <div className="p5-stack">
      <div className="p5-intro">
        <span className="p5-eyebrow">FINAL REVIEW</span>
        <h3>Check your application</h3>
        <p>
          Review your details before signing and submitting this demo
          application.
        </p>
      </div>

      <div className="p5-review-banner">
        <span className="p5-round-icon">
          <LoanIcon size={22} aria-hidden="true" />
        </span>
        <div>
          <span className="p5-muted">Loan selected</span>
          <strong>
            {data.loanType.charAt(0) + data.loanType.slice(1).toLowerCase()}{" "}
            loan
          </strong>
          <span>
            {money(Number(data.amount))} • {data.tenureMonths} months
          </span>
        </div>
      </div>

      <section
        className="p5-review-section"
        aria-labelledby="p5-personal-title"
      >
        <h4 id="p5-personal-title">
          <UserRound size={18} /> Applicant & contact
        </h4>
        <dl className="p5-review-grid">
          <Item label="Full name" value={data.fullName} />
          <Item label="Email" value={data.email} />
          <Item label="Phone" value={data.phone} />
          <Item
            label="Location"
            value={[data.city, data.state, data.pincode]
              .filter(Boolean)
              .join(", ")}
          />
        </dl>
      </section>

      <section className="p5-review-section" aria-labelledby="p5-finance-title">
        <h4 id="p5-finance-title">
          <BriefcaseBusiness size={18} /> Financial summary
        </h4>
        <dl className="p5-review-grid">
          <Item
            label="Monthly income"
            value={money(Number(data.monthlyIncome))}
          />
          <Item
            label="Living expenses"
            value={money(Number(data.monthlyExpenses))}
          />
          <Item label="Existing EMI" value={money(Number(data.existingEmi))} />
          <Item label="Loan purpose" value={data.purpose} />
        </dl>
      </section>

      <div className="p5-document-status">
        <FileCheck2 size={21} aria-hidden="true" />
        <span>
          <strong>
            {documentsUploaded} of {requiredDocuments.length} required documents
            linked
          </strong>
          <small>
            Documents and signature are checked again on submission.
          </small>
        </span>
        {documentsUploaded === requiredDocuments.length && (
          <BadgeCheck size={21} aria-label="All required documents linked" />
        )}
      </div>
    </div>
  );
}
