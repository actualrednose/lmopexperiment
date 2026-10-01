"use client";

/**
 * The dice icon set (GDD §10.1) — reusable SVG polyhedra for every die
 * the game rolls: d4, d6, d8, d10, d12, d20. Color comes from the
 * `currentColor` of the parent, so icons sit naturally on parchment,
 * slate or ember surfaces alike.
 */

export type DiceSides = 4 | 6 | 8 | 10 | 12 | 20;

export interface DiceIconProps {
  sides: DiceSides;
  /** Rendered size in px (default 16). */
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function DiceIcon({
  sides,
  size = 16,
  className,
  strokeWidth = 1.7,
}: DiceIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {sides === 4 && (
          <>
            <path d="M12 3 L22 20.5 H2 Z" />
            <path d="M12 9 L16.2 16.5 H7.8 Z" fillOpacity="0.25" fill="currentColor" />
          </>
        )}
        {sides === 6 && (
          <>
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <rect x="8.6" y="8.6" width="6.8" height="6.8" rx="1.2" fillOpacity="0.25" fill="currentColor" />
          </>
        )}
        {sides === 8 && (
          <>
            <path d="M12 2 L22 12 L12 22 L2 12 Z" />
            <path d="M2 12 H22" />
            <path d="M12 6.8 L16 12 L12 17.2 L8 12 Z" fillOpacity="0.25" fill="currentColor" />
          </>
        )}
        {sides === 10 && (
          <>
            <path d="M12 2.5 L21 9.5 L12 21.5 L3 9.5 Z" />
            <path d="M3 9.5 H21" />
            <path d="M8.6 9.5 L12 13 L15.4 9.5" />
          </>
        )}
        {sides === 12 && (
          <>
            <path d="M12 2.5 L21 9 L17.6 19.5 H6.4 L3 9 Z" />
            <path d="M12 8.2 L16.4 11.4 L14.7 16.4 H9.3 L7.6 11.4 Z" fillOpacity="0.25" fill="currentColor" />
          </>
        )}
        {sides === 20 && (
          <>
            <path d="M12 2 L21 7.4 V16.6 L12 22 L3 16.6 V7.4 Z" />
            <path d="M12 7.6 L16.8 15.8 H7.2 Z" fillOpacity="0.25" fill="currentColor" />
          </>
        )}
      </g>
    </svg>
  );
}
