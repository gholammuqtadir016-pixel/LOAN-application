import { z } from "zod";

const short = z.string().max(254);
const long = z.string().max(2000);

// All client-editable fields of a draft. Use full loanSchema on submission.
export const draftSchema = z
  .object({
    loanType: z.enum(["PERSONAL", "HOME", "BUSINESS"]),
    fullName: short,
    dob: short,
    pan: short,
    aadhaarLast4: short,
    panVerified: z.boolean(),
    aadhaarVerified: z.boolean(),
    email: short,
    phone: short,
    address: long,
    city: short,
    state: short,
    pincode: short,
    employment: z.enum(["SALARIED", "SELF_EMPLOYED", "OTHER"]),
    employer: short,
    experienceYears: short,
    businessName: short,
    businessVintage: short,
    monthlyIncome: short,
    monthlyExpenses: short,
    existingEmi: short,
    creditScore: short,
    amount: short,
    tenureMonths: short,
    purpose: long,
    propertyValue: short,
    propertyAddress: long,
    downPayment: short,
    businessTurnover: short,
    businessType: short,
    personalPurpose: long,
    documentIds: z.record(z.string().max(32), z.string().max(128)),
    signatureId: short,
    consent: z.boolean(),
  })
  .strict();
