"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LoanData } from "@/types/loan";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

type Options = {
  applicationId: string | null;
  data: LoanData;
  enabled: boolean;
  initialVersion: number;
};

/** Only one request in flight per browser tab; server version prevents cross-tab loss. */
export function useDraftAutosave({
  applicationId,
  data,
  enabled,
  initialVersion,
}: Options) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [version, setVersion] = useState(initialVersion);

  const activeId = useRef<string | null>(null);
  const generation = useRef(0);
  const versionRef = useRef(initialVersion);
  const desiredJson = useRef("");
  const savedJson = useRef("");
  const inFlight = useRef<Promise<boolean> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retries = useRef(0);
  const enabledRef = useRef(enabled);
  const conflictRef = useRef(false);
  enabledRef.current = enabled;

  const clearTimers = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    debounceTimer.current = null;
    retryTimer.current = null;
  }, []);

  // When an application loads/changes, its fetched values become the save baseline.
  useEffect(() => {
    if (activeId.current === applicationId) return;
    activeId.current = applicationId;
    generation.current++;
    clearTimers();
    const serialized = JSON.stringify(data);
    desiredJson.current = serialized;
    savedJson.current = serialized;
    versionRef.current = initialVersion;
    setVersion(initialVersion);
    conflictRef.current = false;
    retries.current = 0;
    setStatus("saved");
    setError("");
    setSavedAt(null);
  }, [applicationId, data, initialVersion, clearTimers]);

  const write = useCallback(async (): Promise<boolean> => {
    if (!activeId.current || !enabledRef.current || conflictRef.current)
      return false;
    if (inFlight.current) return inFlight.current;
    const id = activeId.current;
    const gen = generation.current;

    const operation = (async () => {
      try {
        while (
          enabledRef.current &&
          activeId.current === id &&
          generation.current === gen &&
          desiredJson.current !== savedJson.current
        ) {
          setStatus("saving");
          const snapshot = desiredJson.current;
          const response = await fetch(`/api/applications/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: JSON.parse(snapshot),
              version: versionRef.current,
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (response.status === 409 && result.code === "VERSION_CONFLICT") {
            conflictRef.current = true;
            setStatus("conflict");
            setError(
              "Another tab or session changed this draft. Reload to see the latest saved version.",
            );
            return false;
          }
          if (!response.ok)
            throw new Error(result.error || `Save failed (${response.status})`);
          if (generation.current !== gen) return false;
          versionRef.current = result.version;
          setVersion(result.version);
          savedJson.current = snapshot;
          setSavedAt(Date.now());
        }
        if (generation.current === gen && !conflictRef.current) {
          retries.current = 0;
          setError("");
          setStatus("saved");
        }
        return !conflictRef.current;
      } catch (cause) {
        if (generation.current === gen && !conflictRef.current) {
          setStatus("error");
          setError(cause instanceof Error ? cause.message : "Save failed");
          if (retries.current < 3 && enabledRef.current) {
            const delay = 2000 * 2 ** retries.current++;
            retryTimer.current = setTimeout(() => {
              retryTimer.current = null;
              void write();
            }, delay);
          }
        }
        return false;
      }
    })();

    inFlight.current = operation;
    try {
      return await operation;
    } finally {
      if (inFlight.current === operation) inFlight.current = null;
    }
  }, []);

  useEffect(() => {
    if (!applicationId || !enabled || conflictRef.current) return;
    const serialized = JSON.stringify(data);
    desiredJson.current = serialized;
    if (serialized === savedJson.current) return;
    setStatus("unsaved");
    clearTimers();
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      void write();
    }, 850);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [applicationId, data, enabled, clearTimers, write]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const retry = useCallback(() => {
    if (conflictRef.current) return;
    retries.current = 0;
    clearTimers();
    void write();
  }, [clearTimers, write]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (!applicationId || conflictRef.current) return false;
    clearTimers();
    desiredJson.current = JSON.stringify(data);
    if (inFlight.current) await inFlight.current;
    if (conflictRef.current) return false;
    if (desiredJson.current !== savedJson.current) {
      if (!(await write())) return false;
    }
    return !conflictRef.current && desiredJson.current === savedJson.current;
  }, [applicationId, data, clearTimers, write]);

  // Read the latest revision synchronously after flush(), avoiding stale React renders.
  const getVersion = useCallback(() => versionRef.current, []);

  return { status, error, savedAt, retry, flush, version, getVersion };
}
