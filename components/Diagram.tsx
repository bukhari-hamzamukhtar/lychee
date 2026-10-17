"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * One of the three system diagrams, with a click to see it full screen.
 *
 * The pictures are drawn on white, with the partners' real logos in them, so
 * they are shown as they are rather than recoloured: AMD's mark is black and
 * has to sit on something light. In the dark theme the frame is a soft grey
 * and the image multiplies onto it, which takes the glare off without
 * touching a single logo.
 *
 * Sized to fit a section, the smallest labels are small. Clicking opens the
 * picture at the full width of the screen; Escape or another click closes it.
 * The overlay is portalled to <body>: these sit inside scroll reveals, and a
 * transformed ancestor would otherwise trap a fixed overlay inside itself.
 */
export function Diagram({
  src,
  width,
  height,
  alt,
  className = "",
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = scroll;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge: ${alt}`}
        className={`block w-full cursor-zoom-in border border-line bg-white p-3 transition-colors duration-300 hover:border-line-bright dark:bg-[#E6E8EC] sm:p-5 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-sized WebP */}
        <img
          src={src}
          width={width}
          height={height}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full dark:mix-blend-multiply"
        />
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/85 p-4 sm:p-10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full bg-white p-4"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
