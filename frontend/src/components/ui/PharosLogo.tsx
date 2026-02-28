interface PharosLogoProps {
  className?: string;
}

export function PharosLogo({ className = "w-7 h-7" }: PharosLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Light rays from beacon */}
      <line x1="12" y1="2" x2="12" y2="0.5" />
      <line x1="8.5" y1="3.5" x2="7" y2="2" />
      <line x1="15.5" y1="3.5" x2="17" y2="2" />

      {/* Beacon/lantern housing */}
      <rect x="10" y="3" width="4" height="3" rx="0.5" />

      {/* Gallery/walkway */}
      <line x1="8.5" y1="6" x2="15.5" y2="6" />

      {/* Tower body - tapered */}
      <path d="M9.5 6 L8 20 L16 20 L14.5 6" />

      {/* Window details */}
      <line x1="11" y1="10" x2="13" y2="10" />
      <line x1="11" y1="14" x2="13" y2="14" />

      {/* Base */}
      <line x1="6.5" y1="20" x2="17.5" y2="20" />

      {/* Door */}
      <path d="M11 20 L11 17.5 A1 1 0 0 1 13 17.5 L13 20" />
    </svg>
  );
}
