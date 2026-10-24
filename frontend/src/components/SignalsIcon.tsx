// "Signals" companion mascot: a friendly sage-and-cream robot with a sprout on
// its head, a dark smiling face screen, rosy cheeks, and botanical accents.
// Inline SVG so it scales crisply from the nav (24px) to the helper (56px+).
// Pass `animated` to make the buddy bob, blink, and wave its sprout.

interface SignalsIconProps {
  className?: string;
  title?: string;
  animated?: boolean;
}

export function SignalsIcon({
  className = "h-6 w-6",
  title = "Signals",
  animated = false,
}: SignalsIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      className={`${className} ${animated ? "animate-bob" : ""}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      {/* Sprout on top (waves when animated) */}
      <g className={animated ? "animate-wave" : ""} style={{ transformBox: "fill-box" }}>
        <path d="M50 20 C50 12 50 7 50 4" stroke="#6a9184" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M50 10 C44 8 39 10 37 16 C44 18 49 16 50 10 Z" fill="#8fb9a4" />
        <path d="M50 7 C55 4 61 5 63 11 C57 14 51 13 50 7 Z" fill="#8fb9a4" />
      </g>

      {/* Body (sage) */}
      <ellipse cx="50" cy="78" rx="26" ry="20" fill="#e9eee6" />
      <path d="M34 72 a16 16 0 0 1 32 0 v6 a16 16 0 0 1 -32 0 z" fill="#8fb9a4" />
      {/* Little leaf badge on belly */}
      <path d="M47 76 c-1 -3 -4 -4 -6 -3 c0 3 2 5 6 4 z" fill="#dda6ac" />
      <path d="M50 76 c1 -3 4 -4 6 -3 c0 3 -2 5 -6 4 z" fill="#dda6ac" />

      {/* Feet */}
      <ellipse cx="41" cy="95" rx="5" ry="4" fill="#6a9184" />
      <ellipse cx="59" cy="95" rx="5" ry="4" fill="#6a9184" />

      {/* Head helmet (cream) */}
      <ellipse cx="50" cy="42" rx="30" ry="26" fill="#f4f1e8" />
      {/* Side ear (sage) */}
      <circle cx="24" cy="42" r="7" fill="#8fb9a4" />
      <circle cx="24" cy="42" r="3.2" fill="#f4f1e8" />

      {/* Face screen */}
      <ellipse cx="53" cy="42" rx="22" ry="18" fill="#2f3b37" />
      {/* Rosy cheeks */}
      <ellipse cx="44" cy="46" rx="4" ry="2.6" fill="#dda6ac" opacity="0.8" />
      <ellipse cx="63" cy="46" rx="4" ry="2.6" fill="#dda6ac" opacity="0.8" />
      {/* Eyes + smile (eyes blink when animated) */}
      <g
        className={animated ? "animate-blink" : ""}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <path d="M41 40 q3 -4 6 0" stroke="#f6e7c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M59 40 q3 -4 6 0" stroke="#f6e7c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      <path d="M49 48 q4 4 8 0" stroke="#f6e7c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
