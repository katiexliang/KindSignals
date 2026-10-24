// KindSignals brand mark: a "K" formed from a dark-green stem, a sage leaf
// (upper right), and a dusty-rose petal (lower right). Rendered as inline SVG
// so it stays crisp at every size and needs no asset loading.

interface LogoProps {
  className?: string;
  title?: string;
}

export function Logo({ className = "h-9 w-9", title = "KindSignals" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* Stem — dark green */}
      <path
        d="M28 22 h10 a0 0 0 0 1 0 0 v56 h-10 a16 16 0 0 1 0 -56 z"
        fill="#4a6b56"
      />
      {/* Upper leaf — sage */}
      <path
        d="M46 48 C46 33 58 23 74 22 C73 38 63 50 48 50 C47 50 46 49 46 48 Z"
        fill="#a8c3a8"
      />
      {/* Lower petal — dusty rose */}
      <path
        d="M46 52 C46 67 58 77 74 78 C73 62 63 50 48 50 C47 50 46 51 46 52 Z"
        fill="#dba9a4"
      />
    </svg>
  );
}
