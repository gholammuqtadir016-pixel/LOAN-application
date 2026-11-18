"use client";

import type { LoanData } from "@/types/loan";
import { CircleAlert, CircleCheck } from "lucide-react";

export type FieldDefinition = {
  name: keyof LoanData;
  label: string;
  type?: string;
  placeholder?: string;
  options?: string[];
  min?: string;
  max?: string;
};

type FieldProps = {
  data: LoanData;
  patch: (update: Partial<LoanData>) => void;
  errors: Record<string, string>;
  onBlur?: (name: keyof LoanData) => void;
};

export function Field({
  name,
  label,
  data,
  patch,
  errors,
  onBlur,
  type = "text",
  placeholder = "",
  options,
  min,
  max,
}: FieldDefinition & FieldProps) {
  const value = String(data[name] ?? "");
  const error = errors[name];
  const hasError = Boolean(error);

  const inputId = `loan-field-${name}`;
  const errorId = `${inputId}-error`;

  const handleChange = (value: string) => {
    patch({ [name]: value } as Partial<LoanData>);
  };

  return (
    <div className="validated-field">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>

      <div className="validated-input-wrap">
        {options ? (
          <select
            id={inputId}
            value={value}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => onBlur?.(name)}
            className={
              hasError ? "validated-input input-error" : "validated-input"
            }
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}
            type={type}
            value={value}
            min={min}
            max={max}
            placeholder={placeholder}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => onBlur?.(name)}
            className={
              hasError ? "validated-input input-error" : "validated-input"
            }
          />
        )}
      </div>

      {hasError ? (
        <p id={errorId} className="field-error" role="alert">
          <CircleAlert size={14} aria-hidden="true" />
          {error}
        </p>
      ) : (
        value.trim() !== "" && (
          <p className="field-valid">
            <CircleCheck size={14} aria-hidden="true" />
            Value entered
          </p>
        )
      )}
    </div>
  );
}

export function TextFields({
  fields,
  ...props
}: FieldProps & { fields: FieldDefinition[] }) {
  return (
    <div className="form-grid">
      {fields.map((field) => (
        <Field key={field.name} {...field} {...props} />
      ))}
    </div>
  );
}
