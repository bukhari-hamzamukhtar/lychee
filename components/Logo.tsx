/**
 * The mark: a lychee whose bumpy shell is drawn as graph nodes, with three of
 * them wired into an L.
 *
 * The three ideas the brief asked to combine, doing one job each — the fruit
 * gives the silhouette and the stem, the node grid gives the texture a lychee
 * shell actually has, and the wired path through it is both the letter and the
 * thing this product does: a route traced through a graph.
 *
 * Monochrome and stroke-only, so it reads at 20px, inverts for free between
 * themes, and survives being printed on a slide in one colour.
 */
export function Logo({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="LastBuy"
    >
      {/* stem and leaf */}
      <path
        d="M16 7.4V4.2M16 4.2c-1.9-.1-3.2-1-3.6-2.4 1.9-.4 3.3.3 3.6 2.4Zm0 0c1.9-.1 3.2-1 3.6-2.4-1.9-.4-3.3.3-3.6 2.4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* the fruit */}
      <circle cx="16" cy="18.6" r="10.2" stroke="currentColor" strokeWidth="1.4" />

      {/* shell texture, as nodes */}
      <g fill="currentColor" opacity="0.4">
        <circle cx="16" cy="11.6" r="0.85" />
        <circle cx="22.2" cy="15" r="0.85" />
        <circle cx="22.2" cy="22.2" r="0.85" />
        <circle cx="9.8" cy="15" r="0.85" />
        <circle cx="16" cy="25.6" r="0.85" />
      </g>

      {/* the L, wired through three of them */}
      <path
        d="M11.6 13.2V22.6H21.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="currentColor">
        <circle cx="11.6" cy="13.2" r="1.5" />
        <circle cx="11.6" cy="22.6" r="1.5" />
        <circle cx="21.2" cy="22.6" r="1.5" />
      </g>
    </svg>
  );
}

/** Mark plus word, for the header. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Logo size={25} />
      <span className="text-[15px] font-semibold tracking-tight">
        Last<span className="text-accent">Buy</span>
      </span>
    </span>
  );
}
