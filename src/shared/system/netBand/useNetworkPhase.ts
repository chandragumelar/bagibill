import { useCallback, useEffect, useState } from "react";

export type NetworkPhase = "offline" | "sync" | "done";

/**
 * Kaitnya "pita jaringan" — bukan simulasi timer, cuma ngedengerin
 * online/offline browser. Fase "sync" TIDAK otomatis pindah ke "done"
 * lewat timer: itu nunggu mutasi beneran kelar ngirim (antrean mutasi
 * belum ada, backend PR7), jadi pemanggil yang panggil markSynced() waktu
 * itu benar-benar terjadi. Timer palsu sekarang = kelakuan salah nanti.
 */
export function useNetworkPhase() {
  const [phase, setPhase] = useState<NetworkPhase | null>(() => (navigator.onLine ? null : "offline"));

  useEffect(() => {
    function handleOffline(): void {
      setPhase("offline");
    }
    function handleOnline(): void {
      setPhase((current) => (current === "offline" ? "sync" : current));
    }
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const markSynced = useCallback(() => {
    setPhase("done");
  }, []);

  const dismiss = useCallback(() => {
    setPhase(null);
  }, []);

  return { phase, markSynced, dismiss };
}
