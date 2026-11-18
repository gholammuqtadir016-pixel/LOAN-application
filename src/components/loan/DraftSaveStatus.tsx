"use client";

import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  LoaderCircle,
} from "lucide-react";
import type { SaveStatus } from "@/hooks/useDraftAutosave";

type Props = {
  status: SaveStatus;
  error: string;
  savedAt: number | null;
  onRetry: () => void;
};

export function DraftSaveStatus({ status, error, savedAt, onRetry }: Props) {
  return (
    <div
      className={`draft-save-status draft-save-${status}`}
      role="status"
      aria-live="polite"
    >
      {status === "saved" && <CheckCircle2 size={17} aria-hidden="true" />}
      {status === "unsaved" && <CloudUpload size={17} aria-hidden="true" />}
      {status === "saving" && (
        <LoaderCircle size={17} className="draft-spin" aria-hidden="true" />
      )}
      {(status === "error" || status === "conflict") && (
        <AlertCircle size={17} aria-hidden="true" />
      )}

      <span>
        {status === "saved" &&
          (savedAt
            ? `Saved at ${new Date(savedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
            : "All changes saved")}
        {status === "unsaved" && "Unsaved changes"}
        {status === "saving" && "Saving changes…"}
        {status === "error" && `Save failed: ${error}`}
        {status === "conflict" && `Edit conflict: ${error}`}
      </span>

      {status === "conflict" && (
        <button
          type="button"
          className="draft-retry"
          onClick={() => window.location.reload()}
        >
          Reload latest draft
        </button>
      )}
      {status === "error" && (
        <button type="button" className="draft-retry" onClick={onRetry}>
          Retry save
        </button>
      )}
    </div>
  );
}
