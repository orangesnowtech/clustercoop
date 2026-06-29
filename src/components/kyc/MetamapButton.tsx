"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SDK_SRC = "https://web-button.mati.io/button.js";

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SDK_SRC}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load MetaMap"));
    document.body.appendChild(s);
  });
}

export function MetamapButton() {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [launched, setLaunched] = useState(false);

  async function start() {
    setStatus(null);
    setPending(true);
    try {
      const res = await fetch("/api/kyc/start", { method: "POST" });
      if (!res.ok) throw new Error("Could not start verification");
      const { nonce, clientId, flowId } = await res.json();

      await loadSdk();
      // Render the MetaMap web component imperatively to attach the nonce.
      const host = hostRef.current!;
      host.innerHTML = "";
      const btn = document.createElement("metamap-button");
      btn.setAttribute("clientid", clientId);
      btn.setAttribute("flowId", flowId);
      btn.setAttribute("metadata", btoa(JSON.stringify({ nonce })));
      btn.addEventListener("mati:userFinishedSdk", () => {
        setStatus("Submitted — your verification is under review.");
        router.refresh();
      });
      btn.addEventListener("mati:exitedSdk", () => {
        setStatus("Verification was not completed.");
      });
      host.appendChild(btn);
      setLaunched(true);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!launched && (
        <button
          onClick={start}
          disabled={pending}
          className="self-start rounded-lg bg-primary px-5 py-2.5 font-medium text-ink transition hover:bg-primary-pressed disabled:opacity-60"
        >
          {pending ? "Preparing…" : "Start verification"}
        </button>
      )}
      <div ref={hostRef} />
      {status && <p className="text-sm text-ink-soft">{status}</p>}
    </div>
  );
}
