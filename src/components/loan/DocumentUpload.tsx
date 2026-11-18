"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  CheckCircle2,
  CloudUpload,
  FileImage,
  FileText,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";

type DocumentUploadProps = {
  applicationId: string;
  category: string;
  label: string;
  documentId?: string;
  onUploaded: (documentId: string) => void;
};

type UploadStage =
  "idle" | "preparing" | "uploading" | "processing" | "done" | "error";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // Server API limit
const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024; // Before compression

function formattedSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Please choose a JPG, PNG, WebP, or PDF file.";
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  const allowedSize =
    file.type === "application/pdf" ? MAX_UPLOAD_BYTES : MAX_SOURCE_IMAGE_BYTES;

  if (file.size > allowedSize) {
    return file.type === "application/pdf"
      ? "PDF files must be 5 MB or smaller."
      : "Images must be 15 MB or smaller before compression.";
  }

  return null;
}

async function prepareFile(file: File): Promise<File> {
  if (file.type === "application/pdf") return file;

  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const compressed = await imageCompression(file, {
    maxSizeMB: 4.5,
    maxWidthOrHeight: 1800,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.82,
  });

  // Ensure extension and MIME agree after converting to JPEG.
  const jpegName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([compressed], jpegName, { type: "image/jpeg" });
}

function uploadWithProgress(
  applicationId: string,
  category: string,
  file: File,
  onProgress: (percent: number) => void,
  xhrRef: React.MutableRefObject<XMLHttpRequest | null>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    xhrRef.current = request;

    request.open("POST", "/api/documents");
    request.responseType = "json";
    request.withCredentials = true;

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      const body = request.response;
      if (request.status >= 200 && request.status < 300 && body?.id) {
        resolve(body.id as string);
      } else {
        reject(new Error(body?.error || `Upload failed (${request.status})`));
      }
    };
    request.onerror = () =>
      reject(new Error("Network error while uploading. Try again."));
    request.onabort = () => reject(new Error("Upload cancelled."));

    const form = new FormData();
    form.set("applicationId", applicationId);
    form.set("category", category);
    form.set("file", file);
    request.send(form);
  });
}

export function DocumentUpload({
  applicationId,
  category,
  label,
  documentId,
  onUploaded,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState("");

  const busy =
    stage === "preparing" || stage === "uploading" || stage === "processing";
  const uploaded = Boolean(documentId);
  const fileUrl = uploaded
    ? `/api/documents/${encodeURIComponent(documentId!)}`
    : previewUrl;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      xhrRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function showLocalPreview(file: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setPreviewType(file.type);
    setFileName(file.name);
    setFileSize(file.size);
  }

  async function handleFile(file: File) {
    if (busy) return;

    const invalidReason = validateFile(file);
    setError("");
    setProgress(0);

    if (invalidReason) {
      setError(invalidReason);
      setStage("error");
      return;
    }

    setStage("preparing");
    showLocalPreview(file);

    try {
      const prepared = await prepareFile(file);
      if (!mountedRef.current) return;

      if (prepared.size > MAX_UPLOAD_BYTES) {
        throw new Error(
          "Compressed file is still larger than 5 MB. Choose a smaller file.",
        );
      }

      setStage("uploading");
      const uploadedId = await uploadWithProgress(
        applicationId,
        category,
        prepared,
        (percent) => {
          if (!mountedRef.current) return;
          setProgress(percent);
          if (percent === 100) setStage("processing");
        },
        xhrRef,
      );

      if (!mountedRef.current) return;
      // The parent updates the draft's documentIds (and triggers auto-save).
      onUploaded(uploadedId);
      setProgress(100);
      setStage("done");
    } catch (cause) {
      if (!mountedRef.current) return;
      setError(
        cause instanceof Error ? cause.message : "Unable to upload file.",
      );
      setStage("error");
    } finally {
      xhrRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function selectFile() {
    if (!busy) inputRef.current?.click();
  }

  function cancelUpload() {
    xhrRef.current?.abort();
  }

  return (
    <section className="document-upload-card" aria-label={label}>
      <div className="document-upload-heading">
        <div>
          <h3>{label}</h3>
          <p>JPG, PNG, WebP, or PDF • Maximum saved file size: 5 MB</p>
        </div>
        {uploaded && (
          <span className="document-upload-badge">
            <CheckCircle2 size={16} aria-hidden="true" /> Uploaded
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="document-upload-input"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        aria-label={`Select ${label}`}
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div
        className={`document-dropzone ${dragActive ? "is-dragging" : ""} ${busy ? "is-busy" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy) setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
      >
        <CloudUpload size={30} aria-hidden="true" />
        <strong>Drag and drop a document here</strong>
        <span>or choose a file from your device</span>
        <button
          type="button"
          className="document-pick-button"
          disabled={busy}
          onClick={selectFile}
        >
          {uploaded ? "Replace document" : "Browse files"}
        </button>
        <small>Images over 5 MB are compressed automatically.</small>
      </div>

      {(fileName || uploaded) && (
        <div className="document-file-info">
          {previewType.startsWith("image/") ? (
            <FileImage size={21} />
          ) : (
            <FileText size={21} />
          )}
          <div className="document-file-details">
            <strong>{fileName || "Previously uploaded document"}</strong>
            {fileSize > 0 && <span>{formattedSize(fileSize)}</span>}
          </div>
          {fileUrl && !busy && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              View file
            </a>
          )}
        </div>
      )}

      {previewUrl && previewType.startsWith("image/") && !error && (
        <div className="document-image-preview">
          {/* A local object URL is only displayed within the browser. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={`Preview of ${fileName}`} />
        </div>
      )}

      {busy && (
        <div
          className="document-upload-progress"
          role="status"
          aria-live="polite"
        >
          <div className="document-upload-progress-label">
            <span>
              <LoaderCircle size={16} className="document-spin" />
              {stage === "preparing"
                ? "Preparing file…"
                : stage === "processing"
                  ? "Finishing upload…"
                  : "Uploading…"}
            </span>
            {stage !== "preparing" && <strong>{progress}%</strong>}
          </div>
          <div className="document-progress-track">
            <div
              className="document-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          {stage !== "preparing" && (
            <button
              type="button"
              className="document-cancel"
              onClick={cancelUpload}
            >
              <X size={14} /> Cancel upload
            </button>
          )}
        </div>
      )}

      {stage === "done" && uploaded && (
        <p className="document-upload-success" role="status">
          <CheckCircle2 size={16} /> Uploaded successfully. Draft reference will
          be auto-saved.
        </p>
      )}

      {error && (
        <div className="document-upload-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={selectFile}>
            <RotateCcw size={14} /> Choose another file
          </button>
        </div>
      )}
    </section>
  );
}
