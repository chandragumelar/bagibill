import type { ReactNode } from "react";

// Ikon Lucide di-inline sebagai SVG, path persis dari fungsi ic() di
// Lapisan_Sistem.html, cuma yang F0-07 pakai. Stroke-width 2, bukan 1.75 —
// "1.75" di catatan F0-02 (docs/mockup-inventory.md bag. 3) tidak ketemu di
// stroke-width manapun lintas 4 mockup yang dicek ulang; ic() sendiri
// konsisten pakai "2", jadi kode ini ikut kode, bukan catatan lama.
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function WarnIcon() {
  return (
    <Svg>
      <path d="M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </Svg>
  );
}

export function RetryIcon() {
  return (
    <Svg>
      <path d="M21 12a9 9 0 1 1-2.6-6.3M21 4v5h-5" />
    </Svg>
  );
}

export function TrashIcon() {
  return (
    <Svg>
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" />
    </Svg>
  );
}

export function LockIcon() {
  return (
    <Svg>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

export function BanIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </Svg>
  );
}

export function CloudIcon() {
  return (
    <Svg>
      <path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6 19z" />
      <path d="M12 12v6m0 0-2.5-2.5M12 18l2.5-2.5" />
    </Svg>
  );
}

export function OffIcon() {
  return (
    <Svg>
      <path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <path d="M12 20h.01" />
      <path d="M3 3l18 18" />
    </Svg>
  );
}

export function CheckIcon() {
  return (
    <Svg>
      <path d="M5 13l4 4L19 7" />
    </Svg>
  );
}
