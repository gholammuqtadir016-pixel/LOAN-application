export type LoanType = "PERSONAL" | "HOME" | "BUSINESS";
export type Employment = "SALARIED" | "SELF_EMPLOYED" | "OTHER";
export type LoanData = {
  loanType: LoanType;
  fullName: string;
  dob: string;
  pan: string;
  aadhaarLast4: string;
  panVerified: boolean;
  aadhaarVerified: boolean;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  employment: Employment;
  employer: string;
  experienceYears: string;
  businessName: string;
  businessVintage: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  existingEmi: string;
  creditScore: string;
  amount: string;
  tenureMonths: string;
  purpose: string;
  propertyValue: string;
  propertyAddress: string;
  downPayment: string;
  businessTurnover: string;
  businessType: string;
  personalPurpose: string;
  documentIds: Record<string, string>;
  signatureId: string;
  consent: boolean;
};
export type PreApproval = {
  eligible: boolean;
  estimatedEmi: number;
  maxSuggestedEmi: number;
  monthlySurplus: number;
  reasons: string[];
  interestRate: number;
};
export const EMPTY_LOAN: LoanData = {
  loanType: "PERSONAL",
  fullName: "",
  dob: "",
  pan: "",
  aadhaarLast4: "",
  panVerified: false,
  aadhaarVerified: false,
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  employment: "SALARIED",
  employer: "",
  experienceYears: "",
  businessName: "",
  businessVintage: "",
  monthlyIncome: "",
  monthlyExpenses: "",
  existingEmi: "",
  creditScore: "",
  amount: "",
  tenureMonths: "36",
  purpose: "",
  propertyValue: "",
  propertyAddress: "",
  downPayment: "",
  businessTurnover: "",
  businessType: "",
  personalPurpose: "",
  documentIds: {},
  signatureId: "",
  consent: false,
};
export const STEPS = [
  "Loan type",
  "Identity",
  "Contact & address",
  "Work details",
  "Finances",
  "Loan request",
  "Loan-specific",
  "Documents",
  "Review & sign",
  "Pre-approval",
] as const;
