import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  interpolate,
  spring,
  Easing,
  Img,
  staticFile,
} from "remotion";

// ── Constants ────────────────────────────────────────────────────────────────
const ACC   = "#6AB8F7";   // Byte accent blue
const WHITE = "#f0f0ea";
const DIM   = "rgba(240,240,234,0.4)";
const MONO  = "'Geist Mono', 'Courier New', monospace";

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const FAST_IN  = Easing.bezier(0.7, 0, 1, 0.6);

// ── Grain overlay — makes black feel material not digital ───────────────────
const Grain: React.FC = () => (
  <AbsoluteFill style={{ opacity: 0.03, pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id="g">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#g)" />
    </svg>
  </AbsoluteFill>
);

// ── Core text beat — RSVP style, same center position ─────────────────────
//  enter: 10f  |  hold  |  exit: 5f
const Beat: React.FC<{
  text: string;
  from: number;
  duration: number;
  size?: number;
  weight?: number;
  color?: string;
  family?: string;
  tracking?: string;
  dim?: boolean;
  accent?: boolean;
}> = ({ text, from, duration, size = 120, weight = 200, color = WHITE, family = MONO, tracking = "-0.035em", dim = false, accent = false }) => {
  const frame = useCurrentFrame();
  const f = frame - from;

  const ENTER = 10;
  const EXIT_START = duration - 6;

  const opacity = interpolate(
    f,
    [0, ENTER, EXIT_START, duration],
    [0, dim ? 0.38 : 1, dim ? 0.38 : 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EXPO_OUT,
    }
  );
  const y = interpolate(f, [0, ENTER], [16, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO_OUT,
  });
  const sc = interpolate(f, [0, ENTER], [0.93, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO_OUT,
  });

  return (
    <Sequence from={from} durationInFrames={duration} layout="none">
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          opacity,
          transform: `translateY(${y}px) scale(${sc})`,
          fontFamily: family,
          fontSize: size,
          fontWeight: weight,
          color: accent ? ACC : color,
          letterSpacing: tracking,
          textAlign: "center",
          lineHeight: 1.05,
          userSelect: "none",
          whiteSpace: "pre-line",
        }}>
          {text}
        </div>
      </div>
    </Sequence>
  );
};

// ── Thin horizontal rule — punctuates section breaks ──────────────────────
const Rule: React.FC<{ from: number; duration: number }> = ({ from, duration }) => {
  const frame = useCurrentFrame();
  const f = frame - from;
  const w = interpolate(f, [0, 20], [0, 200], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO_OUT,
  });
  const op = interpolate(f, [0, 8, duration - 8, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <Sequence from={from} durationInFrames={duration} layout="none">
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: w, height: 1, background: `rgba(${106},${184},${247},0.55)`, opacity: op }} />
      </div>
    </Sequence>
  );
};

// ── Accent flash — a colored burst to punctuate a word ────────────────────
const Flash: React.FC<{ from: number; duration?: number }> = ({ from, duration = 20 }) => {
  const frame = useCurrentFrame();
  const f = frame - from;
  const op = interpolate(f, [0, 3, duration - 6, duration], [0, 0.12, 0.12, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <Sequence from={from} durationInFrames={duration} layout="none">
      <AbsoluteFill style={{
        background: ACC,
        opacity: op,
        pointerEvents: "none",
      }} />
    </Sequence>
  );
};

// ── Logo outro ─────────────────────────────────────────────────────────────
const LogoOutro: React.FC<{ from: number; duration: number }> = ({ from, duration }) => {
  const frame = useCurrentFrame();
  const f = frame - from;
  const { fps } = useVideoConfig();

  const p = spring({ frame: f, fps, config: { damping: 22, stiffness: 200, mass: 0.8 } });
  const op = interpolate(f, [0, 20, duration - 15, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const iconOp = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO_OUT });
  const iconScale = interpolate(f, [0, 18], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO_OUT });

  return (
    <Sequence from={from} durationInFrames={duration} layout="none">
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div style={{
          opacity: iconOp,
          transform: `scale(${iconScale})`,
          filter: `drop-shadow(0 0 32px rgba(106,184,247,0.35))`,
        }}>
          <Img src={staticFile("icon.png")} style={{ width: 72, height: 72, borderRadius: 16 }} />
        </div>
        <div style={{
          opacity: op,
          fontFamily: MONO,
          fontSize: 52,
          fontWeight: 600,
          color: WHITE,
          letterSpacing: "-0.02em",
          transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px)`,
        }}>
          byte
        </div>
        <div style={{
          opacity: interpolate(f, [25, 40], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXPO_OUT }),
          fontFamily: MONO,
          fontSize: 13,
          color: WHITE,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>
          byte.ai
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};

// ── App preview scene ────────────────────────────────────────────────────────
const CARDS = [
  { q: "What is Mitosis?", a: "Cell division producing two identical daughter cells." },
  { q: "What is Photosynthesis?", a: "Converting light energy into chemical energy (glucose)." },
  { q: "Define DNA.", a: "Double helix molecule carrying genetic instructions." },
];

const AppPreview: React.FC<{ from: number; duration: number }> = ({ from, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - from;

  const panelP = spring({ frame: f, fps, config: { damping: 22, stiffness: 180, mass: 0.9 } });
  const overallOp = interpolate(f, [0, 10, duration - 12, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Which card is "flipped" — cycles every 40 frames
  const safeF = Math.max(0, f);
  const activeCard = Math.min(Math.floor(safeF / 50) % CARDS.length, CARDS.length - 1);
  const flipP = spring({ frame: safeF % 50, fps, config: { damping: 18, stiffness: 200 } });
  const floatY = Math.sin((f / fps) * Math.PI * 0.6) * 6;

  return (
    <Sequence from={from} durationInFrames={duration} layout="none">
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: overallOp }}>
        {/* Subtle glow behind the app */}
        <div style={{
          position: "absolute",
          width: 700, height: 500,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(106,184,247,0.08) 0%, transparent 70%)`,
          filter: "blur(60px)",
          transform: "translateY(-20px)",
        }} />

        {/* App window */}
        <div style={{
          transform: `
            perspective(1200px)
            rotateX(${interpolate(panelP, [0,1], [14, 3])}deg)
            rotateY(${interpolate(panelP, [0,1], [-12, -4])}deg)
            translateY(${interpolate(panelP, [0,1], [60, 0]) + floatY}px)
            scale(${interpolate(panelP, [0,1], [0.88, 1])})
          `,
          width: 680,
          background: "#0f0f13",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(106,184,247,0.07), inset 0 1px 0 rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}>
          {/* Title bar */}
          <div style={{
            height: 44,
            background: "rgba(0,0,0,0.4)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", padding: "0 16px", gap: 8,
          }}>
            {["#ff5f57","#febc2e","#28c840"].map((c, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, opacity: 0.8 }} />
            ))}
            <div style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.28)", letterSpacing: "0.04em" }}>
              Bio Flashcards — Byte Build
            </div>
          </div>

          {/* App content */}
          <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: WHITE, letterSpacing: "-0.02em" }}>
                Biology Flashcards
              </div>
              <div style={{
                background: "rgba(106,184,247,0.12)", border: "1px solid rgba(106,184,247,0.3)",
                borderRadius: 8, padding: "4px 12px",
                fontFamily: MONO, fontSize: 11, color: ACC,
              }}>
                {activeCard + 1} / {CARDS.length}
              </div>
            </div>

            {/* Active card */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(106,184,247,${0.15 + flipP * 0.2})`,
              borderRadius: 14,
              padding: "28px 24px",
              minHeight: 130,
              display: "flex", flexDirection: "column", justifyContent: "center", gap: 14,
              boxShadow: `0 0 30px rgba(106,184,247,${0.04 + flipP * 0.06})`,
              transition: "none",
            }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: ACC, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Question
              </div>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 500, color: WHITE, lineHeight: 1.5 }}>
                {CARDS[activeCard].q}
              </div>
              <div style={{
                fontFamily: MONO, fontSize: 13, color: "rgba(240,240,234,0.55)", lineHeight: 1.6,
                opacity: flipP,
                transform: `translateY(${interpolate(flipP, [0,1], [8, 0])}px)`,
              }}>
                {CARDS[activeCard].a}
              </div>
            </div>

            {/* Card row (mini previews) */}
            <div style={{ display: "flex", gap: 10 }}>
              {CARDS.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: i === activeCard ? ACC : "rgba(255,255,255,0.08)",
                  transition: "none",
                }} />
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              {["← Prev", "Flip", "Next →"].map((label, i) => (
                <div key={i} style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, textAlign: "center",
                  fontFamily: MONO, fontSize: 12, letterSpacing: "0.02em",
                  background: i === 1 ? ACC : "rgba(255,255,255,0.05)",
                  color: i === 1 ? "#000" : "rgba(255,255,255,0.5)",
                  fontWeight: i === 1 ? 600 : 400,
                  border: i === 1 ? "none" : "1px solid rgba(255,255,255,0.08)",
                }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};

// ── Beat definitions ────────────────────────────────────────────────────────
const BEATS: {
  text?: string; dur: number; size?: number; weight?: number;
  dim?: boolean; accent?: boolean; rule?: boolean; flash?: boolean;
  gap?: boolean; logo?: boolean; app?: boolean;
}[] = [
  // ── OPENING ──
  { text: "You have an idea.", dur: 48, size: 88, weight: 300 },
  { gap: true, dur: 12 },
  { text: "A quiz.\nAn app.\nA full website.", dur: 66, size: 72, weight: 200 },
  { gap: true, dur: 16 },

  // ── CONTRAST ──
  { text: "The old way:", dur: 36, size: 52, weight: 400, dim: true },
  { text: "Write the HTML.\nFix the CSS.\nDebug the JS.", dur: 60, size: 66, weight: 300 },
  { gap: true, dur: 14 },
  { text: "Hours.", dur: 36, size: 96, weight: 700, accent: true },
  { flash: true, dur: 16 },
  { gap: true, dur: 14 },

  // ── PIVOT ──
  { rule: true, dur: 28 },
  { text: "The new way.", dur: 38, size: 52, weight: 400, dim: true },
  { text: "Just ask.", dur: 52, size: 108, weight: 200 },
  { gap: true, dur: 14 },

  // ── PRODUCT ──
  { text: "Byte Builds.", dur: 60, size: 108, weight: 600, accent: true },
  { gap: true, dur: 10 },
  { text: "Type a prompt.\nGet a working app.", dur: 62, size: 62, weight: 300 },
  { gap: true, dur: 16 },

  // ── APP DEMO ──
  { app: true, dur: 160 },
  { gap: true, dur: 16 },

  // ── FEATURES ──
  { text: "Flashcard apps.", dur: 36, size: 80, weight: 200 },
  { text: "Quizzes.", dur: 32, size: 80, weight: 200 },
  { text: "Dashboards.", dur: 32, size: 80, weight: 200 },
  { text: "Full HTML websites.", dur: 40, size: 80, weight: 200 },
  { gap: true, dur: 14 },

  // ── SPEED ──
  { text: "Seconds.", dur: 52, size: 120, weight: 700, accent: true },
  { flash: true, dur: 14 },
  { gap: true, dur: 18 },

  // ── CLOSER ──
  { text: "Not someday.\nNow.", dur: 60, size: 88, weight: 300 },
  { gap: true, dur: 18 },

  // ── LOGO ──
  { logo: true, dur: 90 },
];

// ── Compile timing ──────────────────────────────────────────────────────────
let cursor = 0;
const timed = BEATS.map(beat => {
  const start = cursor;
  cursor += beat.dur;
  return { ...beat, start };
});
const TOTAL = cursor;

// ── Main composition ────────────────────────────────────────────────────────
export const ByteBuildsVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Very subtle vignette — center slightly brighter, not a blob
  const vignette = `radial-gradient(ellipse 80% 70% at 50% 50%, #111113 0%, #050507 100%)`;

  return (
    <AbsoluteFill style={{ background: vignette, fontFamily: MONO }}>
      <Grain />

      {timed.map((beat, i) => {
        if (beat.gap) return null;

        if (beat.flash) {
          return <Flash key={i} from={beat.start} duration={beat.dur} />;
        }

        if (beat.rule) {
          return <Rule key={i} from={beat.start} duration={beat.dur} />;
        }

        if (beat.logo) {
          return <LogoOutro key={i} from={beat.start} duration={beat.dur} />;
        }

        if (beat.app) {
          return <AppPreview key={i} from={beat.start} duration={beat.dur} />;
        }

        if (beat.text) {
          return (
            <Beat
              key={i}
              text={beat.text}
              from={beat.start}
              duration={beat.dur}
              size={beat.size}
              weight={beat.weight}
              dim={beat.dim}
              accent={beat.accent}
            />
          );
        }

        return null;
      })}
    </AbsoluteFill>
  );
};
