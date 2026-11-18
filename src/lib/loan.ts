import type { LoanData, PreApproval } from "@/types/loan";
export function calculatePreApproval(data: LoanData): PreApproval {
  const principal = Number(data.amount) || 0;
  const months = Math.max(1, Number(data.tenureMonths) || 1);
  const annualRate =
    data.loanType === "HOME" ? 8.5 : data.loanType === "BUSINESS" ? 12 : 11;
  const r = annualRate / 1200;
  const emi =
    (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const income = Number(data.monthlyIncome) || 0;
  const surplus =
    income -
    (Number(data.monthlyExpenses) || 0) -
    (Number(data.existingEmi) || 0);
  const maxEmi = Math.max(0, income * 0.45 - (Number(data.existingEmi) || 0));
  const reasons: string[] = [];
  if (income <= 0) reasons.push("Provide a positive monthly income.");
  if (emi > maxEmi)
    reasons.push(
      "Estimated EMI exceeds the demo 45% income obligation threshold.",
    );
  if (surplus < emi)
    reasons.push("Monthly surplus is less than the estimated EMI.");
  if (data.creditScore && Number(data.creditScore) < 650)
    reasons.push("Entered credit score is below the demo threshold of 650.");
  return {
    eligible: reasons.length === 0,
    estimatedEmi: Number(emi.toFixed(2)),
    maxSuggestedEmi: Number(maxEmi.toFixed(2)),
    monthlySurplus: Number(surplus.toFixed(2)),
    reasons,
    interestRate: annualRate,
  };
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
