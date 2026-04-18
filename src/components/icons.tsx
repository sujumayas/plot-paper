import type { ReactElement } from "react";

const base = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  width: 16,
  height: 16,
};

export const IconDownload = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconUpload = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M12 20V8m0 0l-5 5m5-5l5 5M4 4h16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconPlus = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);
export const IconSparkle = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path
      d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16z"
      strokeLinejoin="round"
    />
  </svg>
);
export const IconEye = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconHeart = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" strokeLinejoin="round" />
  </svg>
);
export const IconFork = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <circle cx="6" cy="5" r="2" />
    <circle cx="18" cy="5" r="2" />
    <circle cx="12" cy="19" r="2" />
    <path d="M6 7v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 12v5" />
  </svg>
);
export const IconShare = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <circle cx="18" cy="5" r="2" />
    <circle cx="6" cy="12" r="2" />
    <circle cx="18" cy="19" r="2" />
    <path d="M8 11l8-5M8 13l8 5" />
  </svg>
);
export const IconClose = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
);
export const IconImage = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
export const IconSearch = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
export const IconArrow = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M5 12h14m0 0l-6-6m6 6l-6 6" strokeLinecap="round" />
  </svg>
);
export const IconCheck = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M5 13l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconFile = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
    <path d="M14 3v6h6" />
  </svg>
);
export const IconJson = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path
      d="M8 4c-2 0-2 2-2 4s0 4-2 4c2 0 2 2 2 4s0 4 2 4M16 4c2 0 2 2 2 4s0 4 2 4c-2 0-2 2-2 4s0 4-2 4"
      strokeLinecap="round"
    />
  </svg>
);
export const IconTrash = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...base}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
