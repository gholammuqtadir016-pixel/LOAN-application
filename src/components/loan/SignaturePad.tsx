"use client";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
export function SignaturePad({
  applicationId,
  onUploaded,
  signatureId,
}: {
  applicationId: string;
  onUploaded: (id: string) => void;
  signatureId: string;
}) {
  const sig = useRef<SignatureCanvas | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (sig.current?.isEmpty()) {
      setError("Draw your signature first");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const canvas = sig.current!.getCanvas();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Signature unavailable"))),
          "image/png",
        ),
      );
      const fd = new FormData();
      fd.set("applicationId", applicationId);
      fd.set("category", "signature");
      fd.set("file", new File([blob], "signature.png", { type: "image/png" }));
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const obj = await res.json();
      if (!res.ok) throw new Error(obj.error || "Upload failed");
      onUploaded(obj.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save signature");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="signature">
      <SignatureCanvas
        ref={sig}
        penColor="#172e52"
        canvasProps={{ width: 530, height: 160, className: "signature-canvas" }}
      />
      <div className="button-row">
        <button
          className="secondary"
          type="button"
          onClick={() => sig.current?.clear()}
        >
          Clear
        </button>
        <button type="button" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save signature"}
        </button>
      </div>
      {signatureId && <p className="success">✓ Signature saved</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
