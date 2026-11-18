import { z } from "zod";
import type { LoanData } from "@/types/loan";

// =====================================================
// 1. REUSABLE VALIDATION SCHEMAS
// =====================================================

const number = z.string().regex(/^\d+(\.\d+)?$/, "Enter a valid number");

const positive = number.refine(
  (value) => Number(value) > 0,
  "Must be greater than zero",
);

// =====================================================
// 2. MAIN LOAN APPLICATION SCHEMA
// =====================================================

export const loanSchema = z
  .object({
    // -------------------------
    // STEP 1: LOAN TYPE
    // -------------------------

    loanType: z.enum(["PERSONAL", "HOME", "BUSINESS"]),

    // -------------------------
    // STEP 2: PERSONAL DETAILS
    // -------------------------

    fullName: z.string().trim().min(3, "Enter your full name"),

    dob: z.string().refine((value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const date = new Date(`${value}T00:00:00`);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      const now = new Date();

      const minimumDate = new Date(
        now.getFullYear() - 100,
        now.getMonth(),
        now.getDate(),
      );

      const maximumDate = new Date(
        now.getFullYear() - 18,
        now.getMonth(),
        now.getDate(),
      );

      return date >= minimumDate && date <= maximumDate;
    }, "Applicant must be 18–100 years old"),

    pan: z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN format"),

    aadhaarLast4: z
      .string()
      .regex(/^\d{4}$/, "Enter only the last 4 Aadhaar digits"),

    panVerified: z.boolean(),

    aadhaarVerified: z.boolean(),

    // -------------------------
    // STEP 3: CONTACT & ADDRESS
    // -------------------------

    email: z.string().email("Enter a valid email address"),

    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),

    address: z.string().trim().min(8, "Enter your complete address"),

    city: z.string().trim().min(2, "Enter your city"),

    state: z.string().trim().min(2, "Enter your state"),

    pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),

    // -------------------------
    // STEP 4: EMPLOYMENT DETAILS
    // -------------------------

    employment: z.enum(["SALARIED", "SELF_EMPLOYED", "OTHER"]),

    employer: z.string(),

    experienceYears: z.string(),

    businessName: z.string(),

    businessVintage: z.string(),

    // -------------------------
    // STEP 5: FINANCIAL DETAILS
    // -------------------------

    monthlyIncome: positive,

    monthlyExpenses: number,

    existingEmi: number,

    creditScore: z.string(),

    // -------------------------
    // STEP 6: LOAN REQUEST
    // -------------------------

    amount: positive,

    tenureMonths: positive,

    purpose: z.string().trim().min(4, "Enter your loan purpose"),

    // -------------------------
    // STEP 7: LOAN-SPECIFIC DETAILS
    // -------------------------

    propertyValue: z.string(),

    propertyAddress: z.string(),

    downPayment: z.string(),

    businessTurnover: z.string(),

    businessType: z.string(),

    personalPurpose: z.string(),

    // -------------------------
    // STEP 8: DOCUMENTS
    // -------------------------

    documentIds: z.record(z.string(), z.string()),

    // -------------------------
    // STEP 9: SIGNATURE & CONSENT
    // -------------------------

    signatureId: z.string(),

    consent: z.boolean(),
  })

  // =================================================
  // 3. CROSS-FIELD & CONDITIONAL VALIDATION
  // =================================================

  .superRefine((data, ctx) => {
    const addError = (field: keyof LoanData, message: string) => {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message,
      });
    };

    // ---------------------------------------------
    // PAN & AADHAAR VERIFICATION
    // ---------------------------------------------

    if (!data.panVerified) {
      addError("panVerified", "Simulate PAN verification first");
    }

    if (!data.aadhaarVerified) {
      addError("aadhaarVerified", "Simulate Aadhaar verification first");
    }

    // ---------------------------------------------
    // EMPLOYMENT VALIDATION
    // ---------------------------------------------

    if (data.employment === "SALARIED" && !data.employer.trim()) {
      addError("employer", "Employer name is required");
    }

    if (data.employment === "SELF_EMPLOYED" && !data.businessName.trim()) {
      addError("businessName", "Business name is required");
    }

    if (data.employment !== "OTHER") {
      const experience = Number(data.experienceYears);

      if (
        data.experienceYears.trim() === "" ||
        !Number.isFinite(experience) ||
        experience < 0
      ) {
        addError("experienceYears", "Enter valid years of experience");
      }
    }

    // ---------------------------------------------
    // FINANCIAL VALIDATION
    // ---------------------------------------------

    const income = Number(data.monthlyIncome);

    const expenses = Number(data.monthlyExpenses);

    const existingEmi = Number(data.existingEmi);

    if (
      data.monthlyIncome.trim() !== "" &&
      data.monthlyExpenses.trim() !== "" &&
      data.existingEmi.trim() !== "" &&
      Number.isFinite(income) &&
      Number.isFinite(expenses) &&
      Number.isFinite(existingEmi) &&
      expenses + existingEmi >= income
    ) {
      addError(
        "monthlyIncome",
        "Income must exceed expenses and existing EMIs",
      );
    }

    // ---------------------------------------------
    // LOAN AMOUNT VALIDATION
    // ---------------------------------------------

    const loanAmount = Number(data.amount);

    if (Number.isFinite(loanAmount) && loanAmount > 10_000_000) {
      addError("amount", "Maximum demo loan request is ₹1 crore");
    }

    // ---------------------------------------------
    // TENURE VALIDATION
    // ---------------------------------------------

    const tenure = Number(data.tenureMonths);

    if (
      data.tenureMonths.trim() !== "" &&
      (!Number.isInteger(tenure) || tenure < 6 || tenure > 360)
    ) {
      addError("tenureMonths", "Tenure must be between 6 and 360 months");
    }

    // =============================================
    // HOME LOAN VALIDATION
    // =============================================

    if (data.loanType === "HOME") {
      const propertyValue = Number(data.propertyValue);

      const downPayment = Number(data.downPayment);

      // Property value is required.
      if (
        data.propertyValue.trim() === "" ||
        !Number.isFinite(propertyValue) ||
        propertyValue <= 0
      ) {
        addError("propertyValue", "Enter a valid property valuation");
      }

      // Property address is required.
      if (!data.propertyAddress.trim()) {
        addError("propertyAddress", "Property address is required");
      }

      // Down payment is required.
      if (
        data.downPayment.trim() === "" ||
        !Number.isFinite(downPayment) ||
        downPayment < 0
      ) {
        addError("downPayment", "Enter a valid down payment");
      }

      // IMPORTANT FIX:
      // Check the relationship only when all
      // required numerical values are available.
      const validLoanAmount =
        data.amount.trim() !== "" &&
        Number.isFinite(loanAmount) &&
        loanAmount > 0;

      const validPropertyValue =
        data.propertyValue.trim() !== "" &&
        Number.isFinite(propertyValue) &&
        propertyValue > 0;

      const validDownPayment =
        data.downPayment.trim() !== "" &&
        Number.isFinite(downPayment) &&
        downPayment >= 0;

      if (
        validLoanAmount &&
        validPropertyValue &&
        validDownPayment &&
        loanAmount + downPayment > propertyValue
      ) {
        addError(
          "propertyValue",
          "Loan amount plus down payment cannot exceed property value",
        );
      }
    }

    // =============================================
    // BUSINESS LOAN VALIDATION
    // =============================================

    if (data.loanType === "BUSINESS") {
      if (!data.businessName.trim()) {
        addError("businessName", "Business name is required");
      }

      if (!data.businessType.trim()) {
        addError("businessType", "Business type is required");
      }

      if (
        data.businessTurnover.trim() === "" ||
        Number(data.businessTurnover) <= 0 ||
        !Number.isFinite(Number(data.businessTurnover))
      ) {
        addError("businessTurnover", "Enter a valid annual business turnover");
      }

      if (
        data.businessVintage.trim() === "" ||
        Number(data.businessVintage) <= 0 ||
        !Number.isFinite(Number(data.businessVintage))
      ) {
        addError("businessVintage", "Enter valid years in operation");
      }
    }

    // =============================================
    // PERSONAL LOAN VALIDATION
    // =============================================

    if (data.loanType === "PERSONAL" && !data.personalPurpose.trim()) {
      addError("personalPurpose", "Personal loan purpose is required");
    }

    // =============================================
    // DOCUMENT VALIDATION
    // =============================================

    if (!data.documentIds.identity) {
      addError("documentIds", "Identity document is required");
    }

    if (!data.documentIds.income) {
      addError("documentIds", "Income proof is required");
    }

    if (data.loanType === "HOME" && !data.documentIds.property) {
      addError("documentIds", "Property document is required");
    }

    if (data.loanType === "BUSINESS" && !data.documentIds.business) {
      addError("documentIds", "Business document is required");
    }

    // =============================================
    // SIGNATURE & CONSENT
    // =============================================

    if (!data.signatureId) {
      addError("signatureId", "Please sign before submitting");
    }

    if (!data.consent) {
      addError("consent", "Consent is required");
    }
  });

// =====================================================
// 4. FIELDS BELONGING TO EACH STEP
// =====================================================

export const fieldsByStep: (keyof LoanData)[][] = [
  // Step 1: Loan type
  ["loanType"],

  // Step 2: Identity
  ["fullName", "dob", "pan", "aadhaarLast4", "panVerified", "aadhaarVerified"],

  // Step 3: Contact & address
  ["email", "phone", "address", "city", "state", "pincode"],

  // Step 4: Employment
  ["employment", "employer", "experienceYears", "businessName"],

  // Step 5: Financial details
  ["monthlyIncome", "monthlyExpenses", "existingEmi", "creditScore"],

  // Step 6: Loan request
  ["amount", "tenureMonths", "purpose"],

  // Step 7: Loan-specific details
  [
    "propertyValue",
    "propertyAddress",
    "downPayment",
    "businessTurnover",
    "businessType",
    "businessVintage",
    "businessName",
    "personalPurpose",
  ],

  // Step 8: Documents
  ["documentIds"],

  // Step 9: Review and signature
  ["signatureId", "consent"],

  // Step 10: Pre-approval
  [],
];

// =====================================================
// 5. GET ERRORS FOR CURRENT STEP ONLY
// =====================================================

export function errorsForStep(
  data: LoanData,
  step: number,
): Record<string, string> {
  const result = loanSchema.safeParse(data);

  if (result.success) {
    return {};
  }

  const selectedFields = fieldsByStep[step] || [];

  const errors: Record<string, string> = {};

  for (const issue of result.error.issues) {
    const fieldName = String(issue.path[0]);

    // Only return errors for fields on this step.
    if (
      selectedFields.includes(fieldName as keyof LoanData) &&
      !errors[fieldName]
    ) {
      errors[fieldName] = issue.message;
    }
  }

  return errors;
}
