"use client";

import { useEffect, useState } from "react";
import { LoanTypeCards } from "./LoanTypeCards";
import { StepNavigation } from "./StepNavigation";
import { TextFields } from "./FormFields";
import { DocumentUpload } from "./DocumentUpload";
import { SignaturePad } from "./SignaturePad";
import { ApplicationReview } from "./ApplicationReview";
import { PreApprovalDashboard } from "./PreApprovalDashboard";
import { DraftSaveStatus } from "./DraftSaveStatus";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";
import { useLoanStore } from "@/store/loanStore";
import { STEPS, type LoanData, type PreApproval } from "@/types/loan";
import { errorsForStep } from "@/lib/validations";
import { calculatePreApproval } from "@/lib/loan";

type Field = {
  name: keyof LoanData;
  label: string;
  type?: string;
  placeholder?: string;
  options?: string[];
  min?: string;
  max?: string;
};

const fields = (...items: Field[]) => items;
const STEP_STORAGE_PREFIX = "loan-draft-step:";

function storedStep(id: string): number {
  const raw = localStorage.getItem(`${STEP_STORAGE_PREFIX}${id}`);
  const value = Number(raw);
  return raw !== null && Number.isInteger(value) && value >= 0 && value <= 8
    ? value
    : 0;
}

function getFields(data: LoanData): Field[][] {
  return [
    [],
    fields(
      { name: "fullName", label: "Full legal name" },
      { name: "dob", label: "Date of birth", type: "date" },
      { name: "pan", label: "PAN (uppercase)", placeholder: "ABCDE1234F" },
      {
        name: "aadhaarLast4",
        label: "Last four Aadhaar digits",
        placeholder: "1234",
      },
    ),
    fields(
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Indian mobile number", type: "tel" },
      {
        name: "address",
        label: "Street address",
        placeholder: "House number, street, locality",
      },
      { name: "city", label: "City" },
      { name: "state", label: "State" },
      { name: "pincode", label: "PIN code" },
    ),
    fields(
      {
        name: "employment",
        label: "Employment type",
        options: ["SALARIED", "SELF_EMPLOYED", "OTHER"],
      },
      ...(data.employment === "SALARIED"
        ? fields({ name: "employer", label: "Employer name" })
        : []),
      ...(data.employment === "SELF_EMPLOYED"
        ? fields({ name: "businessName", label: "Business name" })
        : []),
      ...(data.employment !== "OTHER"
        ? fields({
            name: "experienceYears",
            label: "Years of work experience",
            type: "number",
            min: "0",
          })
        : []),
    ),
    fields(
      {
        name: "monthlyIncome",
        label: "Monthly income (₹)",
        type: "number",
        min: "0",
      },
      {
        name: "monthlyExpenses",
        label: "Monthly living expenses (₹)",
        type: "number",
        min: "0",
      },
      {
        name: "existingEmi",
        label: "Existing monthly EMIs (₹)",
        type: "number",
        min: "0",
      },
      {
        name: "creditScore",
        label: "Credit score (optional)",
        type: "number",
        min: "300",
        max: "900",
      },
    ),
    fields(
      {
        name: "amount",
        label: "Requested loan amount (₹)",
        type: "number",
        min: "1",
      },
      {
        name: "tenureMonths",
        label: "Tenure (months)",
        type: "number",
        min: "6",
        max: "360",
      },
      { name: "purpose", label: "Loan purpose" },
    ),
    data.loanType === "HOME"
      ? fields(
          {
            name: "propertyValue",
            label: "Property market value (₹)",
            type: "number",
          },
          { name: "downPayment", label: "Down payment (₹)", type: "number" },
          { name: "propertyAddress", label: "Property address" },
        )
      : data.loanType === "BUSINESS"
        ? fields(
            { name: "businessName", label: "Registered business name" },
            { name: "businessType", label: "Business industry / type" },
            {
              name: "businessVintage",
              label: "Years in operation",
              type: "number",
            },
            {
              name: "businessTurnover",
              label: "Annual business turnover (₹)",
              type: "number",
            },
          )
        : fields({
            name: "personalPurpose",
            label: "How will you use the personal loan?",
          }),
  ];
}

export function LoanWizard() {
  const { id, step, data, setId, setStep, patch, hydrate, reset } =
    useLoanStore();

  const [ready, setReady] = useState(false);
  const [draftVersion, setDraftVersion] = useState(0);
  const [error, setError] = useState("");
  const [verification, setVerification] = useState("");
  const [submitted, setSubmitted] = useState<PreApproval | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<keyof LoanData, boolean>>
  >({});

  const autosave = useDraftAutosave({
    applicationId: id,
    data,
    enabled: ready && Boolean(id) && !submitted,
    initialVersion: draftVersion,
  });

  const currentErrors = errorsForStep(data, step);
  const visibleErrors: Record<string, string> = Object.fromEntries(
    Object.entries(currentErrors).filter(
      ([name]) => attemptedNext || touchedFields[name as keyof LoanData],
    ),
  );

  function clearFeedback() {
    setError("");
    setAttemptedNext(false);
    setTouchedFields({});
  }

  // Restore the encrypted form data from PostgreSQL, then the last step
  // from this browser. The server session must still be valid.

useEffect(() => {
  let cancelled = false;
  const controller = new AbortController();

  async function restoreDraft() {
    try {
      const savedId = localStorage.getItem(
        "loan-draft-id"
      );

      if (!savedId) return;

      const response = await fetch(
        `/api/applications/${encodeURIComponent(savedId)}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        }
      );

      if (cancelled) return;

      if (response.status === 401) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      if (response.status === 404) {
        localStorage.removeItem("loan-draft-id");
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Unable to restore draft: HTTP ${response.status}`
        );
      }

      const result = await response.json();

      if (cancelled) return;

      // Support either a direct application object
      // or a wrapped API response.
      const application = result.application ?? result;

      if (!application?.id || !application?.data) {
        throw new Error(
          "Draft API returned incomplete application data."
        );
      }

      hydrate(application.id, application.data);

      if (application.status === "SUBMITTED") {
        setSubmitted(
          calculatePreApproval(application.data)
        );
      }
    } catch (error) {
      if (!cancelled) {
        console.error(
          "Draft restoration failed:",
          error
        );

        setError(
          "We couldn't restore your saved application. " +
          "Your saved data has not been deleted."
        );
      }
    } finally {
      if (!cancelled) {
        setReady(true);
      }
    }
  }

  void restoreDraft();

  // A request should not leave the wizard loading forever.
  const timeout = window.setTimeout(() => {
    controller.abort();
    if (!cancelled) {
      setReady(true);
    }
  }, 10000);

  return () => {
    cancelled = true;
    controller.abort();
    window.clearTimeout(timeout);
  };
}, [hydrate]);

  // Save the current navigation position without persisting personal data
  // in localStorage. The editable form itself stays in PostgreSQL.
  useEffect(() => {
    if (!ready || !id || submitted) return;
    localStorage.setItem(`${STEP_STORAGE_PREFIX}${id}`, String(step));
    setMaxVisitedStep((previous) => Math.max(previous, step));
  }, [ready, id, step, submitted]);

  function edit(changes: Partial<LoanData>) {
    const next = { ...changes };
    if (next.pan !== undefined && next.pan !== data.pan)
      next.panVerified = false;
    if (
      next.aadhaarLast4 !== undefined &&
      next.aadhaarLast4 !== data.aadhaarLast4
    )
      next.aadhaarVerified = false;
    if (next.loanType && next.loanType !== data.loanType) {
      next.documentIds = { ...data.documentIds };
    }
    patch(next);
    setError("");
  }

  async function start() {
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/applications", { method: "POST" });
      const application = await response.json();
      if (!response.ok)
        throw new Error(application.error || "Unable to create draft");

      reset();
      setDraftVersion(application.version);
      setSubmitted(null);
      setMaxVisitedStep(0);
      clearFeedback();
      setId(application.id);
      localStorage.setItem("loan-draft-id", application.id);
      localStorage.setItem(`${STEP_STORAGE_PREFIX}${application.id}`, "0");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create application",
      );
    } finally {
      setStarting(false);
    }
  }

  async function verify(kind: "PAN" | "AADHAAR") {
    setVerification(kind);
    setError("");
    try {
      const value = kind === "PAN" ? data.pan : data.aadhaarLast4;
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, value }),
      });
      const result = await response.json();
      if (!response.ok || !result.verified) throw new Error("Invalid format");
      edit(kind === "PAN" ? { panVerified: true } : { aadhaarVerified: true });
    } catch {
      setError(`${kind} format not valid`);
    } finally {
      setVerification("");
    }
  }

  function navigateToStep(target: number) {
    if (
      submitted ||
      target < 0 ||
      target > maxVisitedStep ||
      target >= STEPS.length
    )
      return;
    if (target > step && Object.keys(errorsForStep(data, step)).length) {
      setAttemptedNext(true);
      setError("Please correct the highlighted fields.");
      return;
    }
    setStep(target);
    clearFeedback();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    setAttemptedNext(true);
    if (Object.keys(errorsForStep(data, step)).length) {
      setError("Please correct the highlighted fields.");
      return;
    }

    const target = Math.min(STEPS.length - 1, step + 1);
    setMaxVisitedStep((previous) => Math.max(previous, target));
    setStep(target);
    clearFeedback();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!id || submitting) return;
    for (let current = 0; current < 9; current++) {
      if (Object.keys(errorsForStep(data, current)).length) {
        setStep(current);
        setMaxVisitedStep((previous) => Math.max(previous, current));
        setAttemptedNext(true);
        setError("Correct the required information before submitting.");
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      const saved = await autosave.flush();
      if (!saved) {
        throw new Error(
          "Your latest edits could not be saved. Retry saving before submitting.",
        );
      }

      const response = await fetch(`/api/applications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, version: autosave.getVersion() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission failed");

      setSubmitted(result.preApproval);
      setStep(9);
      setMaxVisitedStep(9);
      clearFeedback();
      localStorage.removeItem(`${STEP_STORAGE_PREFIX}${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function startAnother() {
    if (id) localStorage.removeItem(`${STEP_STORAGE_PREFIX}${id}`);
    localStorage.removeItem("loan-draft-id");
    reset();
    setDraftVersion(0);
    setSubmitted(null);
    setMaxVisitedStep(0);
    clearFeedback();
  }

  if (!ready)
    return (
      <main className="shell">
        <p>Loading saved application…</p>
      </main>
    );

  if (!id) {
    return (
      <main className="shell">
        <div className="hero">
          <span className="eyebrow">LOAN APPLICATION PORTAL</span>
          <h1>Apply with confidence</h1>
          <p>
            Complete your application in ten guided steps. Your draft can resume
            in this browser while your session remains valid.
          </p>
          <button
            type="button"
            disabled={starting}
            onClick={() => void start()}
          >
            {starting ? "Creating draft…" : "Start application"}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  const fieldGroups = getFields(data);
  const preApproval = submitted ?? calculatePreApproval(data);
  const documentCategories = [
    "identity",
    "income",
    ...(data.loanType === "HOME" ? ["property"] : []),
    ...(data.loanType === "BUSINESS" ? ["business"] : []),
  ];

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">SECURE DEMO • NOT A REAL LENDER</span>
          <h1>Loan application</h1>
          <p className="muted">Application ID: {id}</p>
        </div>
        <DraftSaveStatus
          status={autosave.status}
          error={autosave.error}
          savedAt={autosave.savedAt}
          onRetry={autosave.retry}
        />
      </header>

      <div className="layout">
        <StepNavigation
          step={step}
          maxVisitedStep={maxVisitedStep}
          onStepChange={navigateToStep}
          locked={Boolean(submitted)}
        />

        <section className="panel">
          <div className="step-heading">
            <span className="eyebrow">
              STEP {step + 1} OF {STEPS.length}
            </span>
            <h2>{STEPS[step]}</h2>
          </div>

          {step === 0 && (
            <>
              <LoanTypeCards
                value={data.loanType}
                onChange={(loanType) => edit({ loanType })}
              />
              <p className="note">
                Loan types have different information and document requirements.
              </p>
            </>
          )}

          {step >= 1 && step <= 6 && (
            <TextFields
              data={data}
              patch={edit}
              errors={visibleErrors}
              onBlur={(field) =>
                setTouchedFields((previous) => ({ ...previous, [field]: true }))
              }
              fields={fieldGroups[step] || []}
            />
          )}

          {step === 1 && (
            <div className="verify-row">
              <div>
                <button
                  type="button"
                  className="secondary"
                  disabled={Boolean(verification)}
                  onClick={() => void verify("PAN")}
                >
                  {verification === "PAN" ? "Checking…" : "Simulate PAN check"}
                </button>
                {data.panVerified && (
                  <p className="success">✓ Format verified (simulation)</p>
                )}
                {visibleErrors.panVerified && (
                  <small className="error">{visibleErrors.panVerified}</small>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="secondary"
                  disabled={Boolean(verification)}
                  onClick={() => void verify("AADHAAR")}
                >
                  {verification === "AADHAAR"
                    ? "Checking…"
                    : "Simulate Aadhaar check"}
                </button>
                {data.aadhaarVerified && (
                  <p className="success">✓ Format verified (simulation)</p>
                )}
                {visibleErrors.aadhaarVerified && (
                  <small className="error">
                    {visibleErrors.aadhaarVerified}
                  </small>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <p className="note">
              Enter your address manually. Live autocomplete requires a Places
              provider and API key.
            </p>
          )}

          {step === 7 && (
            <>
              <p className="note">
                Files are stored privately on the development server. Do not
                upload real identity documents to an untrusted demo.
              </p>
              {documentCategories.map((category) => (
                <DocumentUpload
                  key={category}
                  applicationId={id}
                  category={category}
                  label={`${category[0].toUpperCase()}${category.slice(1)} proof`}
                  documentId={data.documentIds[category]}
                  onUploaded={(documentId) =>
                    edit({
                      documentIds: {
                        ...data.documentIds,
                        [category]: documentId,
                      },
                    })
                  }
                />
              ))}
              {visibleErrors.documentIds && (
                <p className="error">{visibleErrors.documentIds}</p>
              )}
            </>
          )}

          {step === 8 && (
            <>
              <ApplicationReview data={data} />
              <h3>E-signature</h3>
              <SignaturePad
                applicationId={id}
                signatureId={data.signatureId}
                onUploaded={(signatureId) => edit({ signatureId })}
              />
              {visibleErrors.signatureId && (
                <p className="error">{visibleErrors.signatureId}</p>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={data.consent}
                  onChange={(event) => edit({ consent: event.target.checked })}
                />
                I consent to submitting this simulated application for demo
                evaluation.
              </label>
              {visibleErrors.consent && (
                <p className="error">{visibleErrors.consent}</p>
              )}
            </>
          )}

          {step === 9 && (
            <PreApprovalDashboard
              data={data}
              assessment={preApproval}
              submitted={Boolean(submitted)}
              applicationId={id}
            />
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <footer className="actions">
            {step > 0 && !submitted && (
              <button
                type="button"
                className="secondary"
                disabled={submitting}
                onClick={() => navigateToStep(step - 1)}
              >
                Back
              </button>
            )}
            {step < 8 && !submitted && (
              <button type="button" disabled={submitting} onClick={next}>
                Continue
              </button>
            )}
            {step === 8 && !submitted && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            )}
            {submitted && (
              <button
                type="button"
                className="secondary"
                onClick={startAnother}
              >
                Start another application
              </button>
            )}
          </footer>
        </section>
      </div>
    </main>
  );
}
