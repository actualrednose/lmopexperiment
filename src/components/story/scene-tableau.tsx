"use client";

/**
 * The scene tableau (GDD §8.1): the left 55 % of story mode — a layered
 * composition of CSS gradient skies, silhouette props and posed hero
 * tokens that gives every scene a distinct silhouette without a single
 * drawn (raster) asset. All art is SVG + CSS from the locked palette;
 * the far layer drifts gently (reduced motion collapses it).
 */

import { HeroToken } from "@/components/ui/hero-token";
import { PARTY } from "@/content/party";
import type { TableauProp, TableauSpec, TableauTime } from "@/game/scene-types";

/* ── Sky gradients: setting × time ── */

const SKY: Record<TableauSpec["setting"], Record<TableauTime, string>> = {
  city: {
    morning: "linear-gradient(180deg, #2C3B4D 0%, #43586C 42%, #6B7480 72%, #8B8676 100%)",
    day: "linear-gradient(180deg, #2E4258 0%, #4A6274 45%, #778084 75%, #8F897A 100%)",
    dusk: "linear-gradient(180deg, #232C3C 0%, #3A4052 48%, #6B4A45 80%, #7A554A 100%)",
    night: "linear-gradient(180deg, #0F1620 0%, #1A2432 55%, #232F3E 82%, #2A3542 100%)",
  },
  road: {
    morning: "linear-gradient(180deg, #31465C 0%, #4C6474 42%, #77826E 72%, #8B8765 100%)",
    day: "linear-gradient(180deg, #2E4258 0%, #476070 40%, #5F7A6F 70%, #7D7E60 100%)",
    dusk: "linear-gradient(180deg, #26303E 0%, #404852 46%, #71504A 80%, #7A554A 100%)",
    night: "linear-gradient(180deg, #101823 0%, #16202E 58%, #1E2A38 84%, #242E3A 100%)",
  },
  camp: {
    morning: "linear-gradient(180deg, #2A3A4A 0%, #4A5A64 50%, #6E7462 80%, #7C7A62 100%)",
    day: "linear-gradient(180deg, #2E4258 0%, #4A6272 45%, #6E7A66 75%, #7F7C62 100%)",
    dusk: "linear-gradient(180deg, #222B38 0%, #3B4450 50%, #6E4E46 82%, #7A554A 100%)",
    night: "linear-gradient(180deg, #0D141D 0%, #141D2A 55%, #1C2734 82%, #222C38 100%)",
  },
  meadow: {
    morning: "linear-gradient(180deg, #33485E 0%, #55707A 42%, #8A9370 72%, #9A9263 100%)",
    day: "linear-gradient(180deg, #35506B 0%, #5B7A80 38%, #8A9470 68%, #97905F 100%)",
    dusk: "linear-gradient(180deg, #28313E 0%, #464E58 46%, #7A5347 80%, #7A554A 100%)",
    night: "linear-gradient(180deg, #101823 0%, #16202E 58%, #1E2A38 84%, #242E3A 100%)",
  },
  forest: {
    morning: "linear-gradient(180deg, #28394A 0%, #3A5354 44%, #566A50 74%, #4E5F3E 100%)",
    day: "linear-gradient(180deg, #22323E 0%, #2F4844 46%, #3C5642 78%, #31412F 100%)",
    dusk: "linear-gradient(180deg, #202B36 0%, #33424A 48%, #5E4A42 82%, #4A4436 100%)",
    night: "linear-gradient(180deg, #0C1219 0%, #131C26 58%, #1A2530 84%, #1F2A30 100%)",
  },
  hideout: {
    morning: "linear-gradient(180deg, #2B3A46 0%, #3E5458 42%, #5A6B58 72%, #465440 100%)",
    day: "linear-gradient(180deg, #26313F 0%, #3A4A52 40%, #4E6058 68%, #3A4A40 100%)",
    dusk: "linear-gradient(180deg, #232D3A 0%, #384952 44%, #6B5347 80%, #4A4E3E 100%)",
    night: "linear-gradient(180deg, #0E141C 0%, #162028 58%, #1C282E 84%, #202A2E 100%)",
  },
};

/* ── The tableau ── */

export function SceneTableau({ spec }: { spec: TableauSpec }) {
  const night = spec.time === "night";
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* sky */}
      <div className="absolute inset-0" style={{ background: SKY[spec.setting][spec.time] }} />

      {/* sun / moon glow */}
      <div
        className="absolute h-56 w-56 rounded-full"
        style={{
          left: "58%",
          top: "12%",
          background:
            spec.time === "night"
              ? "radial-gradient(circle, rgba(237,231,217,0.28) 0%, rgba(237,231,217,0) 65%)"
              : spec.time === "dusk"
                ? "radial-gradient(circle, rgba(232,169,124,0.5) 0%, rgba(212,135,90,0) 62%)"
                : "radial-gradient(circle, rgba(237,231,217,0.22) 0%, rgba(237,231,217,0) 62%)",
        }}
      />

      {/* far silhouette layer */}
      <svg
        className="ga-drift absolute inset-0 h-full w-full"
        viewBox="0 0 900 520"
        preserveAspectRatio="xMidYMax slice"
      >
        <FarLayer setting={spec.setting} />
        <PropsLayer props={spec.props ?? []} night={night} />
      </svg>

      {/* time-of-day tint */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            spec.time === "night"
              ? "linear-gradient(180deg, rgba(13,20,29,0.42), rgba(13,20,29,0.18))"
              : spec.time === "dusk"
                ? "linear-gradient(180deg, rgba(122,85,74,0.16), rgba(122,85,74,0.3))"
                : "linear-gradient(180deg, rgba(237,231,217,0.03), rgba(237,231,217,0))",
        }}
      />

      {/* posed hero tokens */}
      <div className="absolute right-5 bottom-4 flex items-end gap-2 sm:right-8">
        {PARTY.map((sheet, i) => (
          <div key={sheet.id} style={{ transform: `translateY(${(i % 2) * -6}px)` }}>
            <HeroToken heroId={sheet.id} size={40} className="drop-shadow-[0_4px_10px_rgba(10,14,20,0.65)]" />
          </div>
        ))}
      </div>

      {/* vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 100% at 50% 30%, rgba(15,21,30,0) 52%, rgba(15,21,30,0.5) 100%)",
        }}
      />
    </div>
  );
}

/* ── Far layer: the setting's skyline silhouette ── */

function FarLayer({ setting }: { setting: TableauSpec["setting"] }) {
  switch (setting) {
    case "city":
      return (
        <g>
          {/* Neverwinter rooftops */}
          <path
            d="M0 330 L60 330 L60 300 L100 300 L100 330 L150 318 L210 318 L210 292 L250 292 L250 318 L330 322 L390 296 L450 296 L450 322 L520 318 L590 288 L640 288 L640 318 L720 324 L790 300 L850 300 L850 330 L900 330 V520 H0 Z"
            fill="#232E3F"
          />
          <g fill="#1B2534">
            <rect x="180" y="262" width="14" height="32" />
            <rect x="560" y="256" width="16" height="36" />
            <rect x="740" y="264" width="12" height="28" />
            <path d="M386 296 l14 -20 l14 20 Z" />
          </g>
          {/* the gate tower */}
          <path d="M430 330 V246 L452 232 L474 246 V330 Z" fill="#1B2534" />
          <path d="M420 330 V250 L438 238 V330 Z M486 330 V250 L468 238 V330 Z" fill="#141C27" />
          <path d="M0 520 V392 L220 402 L470 386 L700 400 L900 390 V520 Z" fill="#161F2B" />
        </g>
      );
    case "road":
    case "meadow":
      return (
        <g>
          <path
            d="M0 316 L130 276 L270 306 L420 262 L560 300 L700 266 L830 302 L900 286 V520 H0 Z"
            fill="#232E3F"
          />
          <g fill="#141C27">
            <path d="M96 282 l10 -30 l10 30 z" />
            <path d="M122 288 l8 -24 l8 24 z" />
            <path d="M414 268 l11 -33 l11 33 z" />
            <path d="M442 274 l8 -24 l8 24 z" />
            <path d="M688 272 l10 -30 l10 30 z" />
            <path d="M714 278 l8 -24 l8 24 z" />
          </g>
          <path d="M0 520 V352 L180 372 L390 350 L620 376 L820 352 L900 368 V520 Z" fill="#161F2B" />
          {/* the worn road east */}
          <path d="M420 520 L580 520 L520 346 L468 346 Z" fill="#37322C" />
          <path d="M452 520 L472 520 L498 352 L486 352 Z" fill="#2C2823" />
        </g>
      );
    case "camp":
      return (
        <g>
          <path d="M0 356 L200 336 L430 358 L660 334 L900 356 V520 H0 Z" fill="#131C28" />
          <g fill="#0E141D">
            <path d="M150 344 l9 -26 l9 26 z" />
            <path d="M700 340 l9 -26 l9 26 z" />
            <path d="M420 356 l8 -22 l8 22 z" />
          </g>
          {/* the distant meadow grass line */}
          <path d="M0 420 Q120 404 240 420 T480 420 T720 418 T900 424 V520 H0 Z" fill="#101722" />
        </g>
      );
    case "forest":
      return (
        <g>
          <path d="M0 330 L130 292 L260 322 L400 282 L540 318 L680 286 L810 318 L900 298 V520 H0 Z" fill="#1D2C30" />
          {/* pine ranks, closer and darker */}
          <g fill="#14201F">
            <path d="M40 328 l14 -46 l14 46 z" />
            <path d="M84 334 l11 -34 l11 34 z" />
            <path d="M236 320 l14 -44 l14 44 z" />
            <path d="M282 326 l10 -30 l10 30 z" />
            <path d="M472 316 l14 -46 l14 46 z" />
            <path d="M516 324 l10 -30 l10 30 z" />
            <path d="M700 322 l14 -44 l14 44 z" />
            <path d="M746 328 l10 -30 l10 30 z" />
          </g>
          <path d="M0 520 V382 L200 396 L420 378 L640 398 L860 380 L900 390 V520 Z" fill="#101918" />
          {/* the climbing game path */}
          <path d="M120 520 C240 470 300 440 430 408 C520 388 560 376 600 356 L614 366 C570 390 520 404 440 424 C320 456 240 486 150 522 Z" fill="#2E2A22" />
        </g>
      );
    case "hideout":
      return (
        <g>
          {/* the clenched-fist hill */}
          <path
            d="M0 360 L110 318 L210 288 L330 268 L470 258 L600 266 L720 286 L820 314 L900 344 V520 H0 Z"
            fill="#1C2A2C"
          />
          <g fill="#141F20">
            <path d="M180 300 l12 -38 l12 38 z" />
            <path d="M300 280 l13 -42 l13 42 z" />
            <path d="M470 268 l13 -42 l13 42 z" />
            <path d="M640 278 l12 -38 l12 38 z" />
            <path d="M790 306 l11 -32 l11 32 z" />
          </g>
          {/* the cave mouth, dark and tall enough to drive a wagon through */}
          <path d="M560 520 C560 430 570 380 620 362 C660 350 740 356 766 376 C796 398 800 440 800 520 Z" fill="#0C1118" />
          <path d="M576 520 C578 442 590 396 628 380 C662 370 730 374 752 392 C774 412 778 448 780 520 Z" fill="#070B10" />
          <path d="M0 520 V436 L220 452 L470 436 L720 456 L900 442 V520 Z" fill="#101A1A" />
        </g>
      );
  }
}

/* ── Props layer: silhouettes composed per scene ── */

function PropsLayer({ props, night }: { props: TableauProp[]; night: boolean }) {
  return (
    <g>
      {props.map((prop) => (
        <g key={prop}>{PROP_ART[prop](night)}</g>
      ))}
    </g>
  );
}

const PROP_ART: Record<TableauProp, (night: boolean) => React.ReactNode> = {
  wagon: () => (
    <g transform="translate(140 430)">
      <rect x="30" y="18" width="130" height="34" rx="6" fill="#2E2820" />
      <path d="M30 52 L160 52 L172 62 L18 62 Z" fill="#241F19" />
      <rect x="150" y="24" width="52" height="10" rx="4" fill="#332C22" />
      <circle cx="62" cy="66" r="16" fill="#1A1A16" />
      <circle cx="62" cy="66" r="6" fill="#3C3A32" />
      <circle cx="128" cy="66" r="16" fill="#1A1A16" />
      <circle cx="128" cy="66" r="6" fill="#3C3A32" />
      <path d="M36 18 L52 -8 L64 -8 L48 18 Z" fill="#26221B" />
      <path d="M92 18 L108 -8 L120 -8 L104 18 Z" fill="#26221B" />
    </g>
  ),
  deadHorses: () => (
    <g transform="translate(420 470)">
      <path d="M0 22 C6 8 24 0 44 4 C58 7 66 14 70 22 C74 30 66 38 52 40 L10 40 C0 38 -4 30 0 22 Z" fill="#2A2620" />
      <path d="M64 12 C70 8 78 10 80 16 C82 22 76 26 70 24 Z" fill="#2A2620" />
      <path d="M96 30 C100 20 114 14 130 18 C142 21 148 28 150 34 C152 40 144 46 132 46 L104 46 C94 44 92 36 96 30 Z" fill="#241F1A" />
      {/* black-fletched arrows standing in the hides */}
      <g>
        <rect x="34" y="-18" width="3.4" height="26" rx="1.4" fill="#7A5C40" transform="rotate(-14 34 4)" />
        <path d="M22 -20 L38 -24 L34 -10 Z" fill="#0D1219" />
        <rect x="118" y="-12" width="3.4" height="24" rx="1.4" fill="#7A5C40" transform="rotate(10 118 0)" />
        <path d="M108 -12 L126 -16 L120 -2 Z" fill="#0D1219" />
      </g>
    </g>
  ),
  arrows: () => (
    <g transform="translate(250 486)">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i * 26} ${i * 4}) rotate(${-30 + i * 26})`}>
          <rect x="0" y="-2" width="46" height="3.6" rx="1.4" fill="#7A5C40" />
          <path d="M46 -5.4 L56 -1 L46 5 L48.5 0 Z" fill="#B9C2CC" />
          <path d="M0 -1.8 L11 -9 L16 -9 L5 -1.8 Z" fill="#0D1219" />
          <path d="M0 1.8 L11 9 L16 9 L5 1.8 Z" fill="#0D1219" />
        </g>
      ))}
    </g>
  ),
  campfire: (night) => (
    <g transform="translate(300 452)">
      <circle cx="34" cy="26" r="86" fill={night ? "rgba(232,169,124,0.2)" : "rgba(232,169,124,0.1)"} />
      <g className="ga-glow">
        <path d="M34 -12 C46 4 54 12 54 24 C54 38 45 46 34 46 C23 46 14 38 14 24 C14 12 24 2 34 -12 Z" fill="#D4875A" />
        <path d="M34 6 C39 15 43 19 43 26 C43 34 39 39 34 39 C29 39 25 34 25 26 C25 19 29 15 34 6 Z" fill="#F5EFE2" />
      </g>
      <rect x="8" y="44" width="52" height="7" rx="3" fill="#241F19" transform="rotate(-8 34 47)" />
      <rect x="10" y="46" width="50" height="7" rx="3" fill="#1D1915" transform="rotate(9 34 49)" />
      <g fill="#8F8468">
        <circle cx="14" cy="58" r="2" />
        <circle cx="52" cy="60" r="2.4" />
      </g>
    </g>
  ),
  thicket: () => (
    <g fill="#141F14">
      <path d="M0 520 C10 470 34 442 66 432 C96 424 120 434 128 452 C138 474 120 500 88 508 L0 520 Z" />
      <path d="M760 520 C770 474 796 448 828 440 C858 434 882 446 888 464 C894 486 872 506 840 512 L760 520 Z" />
      <path d="M60 452 C68 436 82 428 94 430 C86 442 82 456 84 468 C74 466 64 460 60 452 Z" fill="#1B2718" />
      <path d="M812 458 C820 442 834 436 846 438 C838 450 834 462 836 474 C826 472 816 466 812 458 Z" fill="#1B2718" />
    </g>
  ),
  mapCase: () => (
    <g transform="translate(600 496)">
      <path d="M0 10 C2 4 10 0 20 1 L64 5 C72 6 78 10 78 14 C78 18 72 21 64 21 L18 23 C8 23 1 18 0 10 Z" fill="#4A3626" />
      <path d="M14 3 L20 1 L22 21 L16 23 Z" fill="#33261A" />
      <path d="M30 6 L44 7 L44 19 L30 19 Z" fill="#241A10" />
      <path d="M48 8 L56 9 L56 18 L48 18 Z" fill="#5C4630" />
    </g>
  ),
  wolfTracks: () => (
    <g fill="#20261F" transform="translate(180 492)">
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${i * 34} ${i * 6})`}>
          <ellipse cx="0" cy="0" rx="5.4" ry="4" />
          <circle cx="8" cy="-5" r="1.8" />
          <circle cx="8.6" cy="0" r="1.8" />
          <circle cx="7.8" cy="5" r="1.8" />
          <circle cx="4.6" cy="-8" r="1.6" />
        </g>
      ))}
    </g>
  ),
  stream: () => (
    <g>
      <path
        d="M660 362 C668 392 672 428 668 470 C666 494 660 510 652 520 L700 520 C708 506 712 488 713 466 C715 424 710 386 700 356 Z"
        fill="#5E8B96"
        opacity="0.85"
      />
      <path
        d="M672 366 C678 394 681 428 677 468 C675 490 670 506 664 518 L682 518 C688 502 691 486 692 466 C693 428 688 392 680 362 Z"
        fill="#8FB4BC"
        opacity="0.8"
      />
      {/* the pool below */}
      <ellipse cx="690" cy="504" rx="120" ry="18" fill="#3E606C" opacity="0.75" />
    </g>
  ),
  brush: () => (
    <g>
      <path
        d="M556 520 C560 448 576 398 620 372 C664 350 742 354 782 382 C812 404 818 452 816 520 Z"
        fill="#16221A"
        opacity="0.92"
      />
      <g stroke="#22331F" strokeWidth="4" fill="none" opacity="0.9">
        <path d="M600 512 C606 460 622 414 654 388" />
        <path d="M660 514 C664 462 674 420 700 396" />
        <path d="M724 516 C726 470 734 434 754 412" />
      </g>
    </g>
  ),
  caveMouth: () => (
    <g>
      <path
        d="M560 520 C560 430 570 380 620 362 C660 350 740 356 766 376 C796 398 800 440 800 520 Z"
        fill="#0C1118"
      />
      <path d="M576 520 C578 442 590 396 628 380 C662 370 730 374 752 392 C774 412 778 448 780 520 Z" fill="#060A0F" />
    </g>
  ),
};
