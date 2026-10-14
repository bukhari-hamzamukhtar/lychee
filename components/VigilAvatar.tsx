/**
 * Vigil — the keeper of the last light.
 *
 * An original character rather than a licensed one: a hooded watchman holding a
 * lantern, which is what this product does — stand at the edge of the window and
 * warn you before it shuts. Drawn in the same stroke language as the mark so the
 * two read as one hand.
 *
 * The lantern is the only lit element, and it is what animates when Vigil is
 * thinking.
 */
export function VigilAvatar({
  size = 40,
  thinking = false,
  className = "",
}: {
  size?: number;
  thinking?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Vigil"
    >
      {/* cowl */}
      <path
        d="M16.5 40V24.5C16.5 19.8 19.9 16 24.1 16c4.2 0 7.6 3.8 7.6 8.5V40"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* hood crown and shoulders */}
      <path
        d="M13.4 40c0-6 1.3-10.8 1.3-14.9C14.7 17.9 18.9 12 24.1 12s9.4 5.9 9.4 13.1c0 4.1 1.3 8.9 1.3 14.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* the dark under the hood */}
      <path
        d="M19.6 25.2c0-3 2-5.4 4.5-5.4s4.5 2.4 4.5 5.4c0 3-2 5.4-4.5 5.4s-4.5-2.4-4.5-5.4Z"
        fill="currentColor"
        opacity="0.14"
      />
      {/* eyes */}
      <g className={thinking ? "animate-pulse-soft" : ""}>
        <circle cx="21.9" cy="25.3" r="1.25" fill="#7DD3FC" />
        <circle cx="26.3" cy="25.3" r="1.25" fill="#7DD3FC" />
      </g>

      {/* lantern on its hook */}
      <path d="M37.6 20.5v3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect
        x="34.4"
        y="23.9"
        width="6.4"
        height="7.4"
        rx="0.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="37.6"
        cy="27.6"
        r="1.5"
        fill="#7DD3FC"
        className={thinking ? "animate-pulse-soft" : ""}
      />
      {/* the light it throws */}
      <path
        d="M31.6 27.6h-1.4M43.6 27.6h1.4M37.6 33.6v1.4"
        stroke="#7DD3FC"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
