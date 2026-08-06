import { forwardRef, useEffect, useRef, useState } from "react";
import logo from "@/assets/logo.png";
import bedroom from "@/assets/voucher-bedroom.jpg";

export interface VoucherCardProps {
  amount: number;
  code: string;
  recipient?: string | null;
  from?: string | null;
  validUntil?: string | Date | null;
  message?: string | null;
  website?: string;
}

const CARD_W = 1050;
const CARD_H = 700;

const CREAM = "#F8F5EF";
const GOLD = "#B58A45";
const GREEN = "#173B33";

const formatAmount = (n: number) => new Intl.NumberFormat("en-US").format(n);

const formatDate = (d?: string | Date | null) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

/** Fixed-size, print-accurate voucher artwork (1050x700, DL/A6 landscape ratio). */
export const VoucherArtwork = forwardRef<HTMLDivElement, VoucherCardProps>(
  ({ amount, code, recipient, from, validUntil, message, website = "dreamnestrw.com" }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          background: CREAM,
          borderRadius: 28,
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 30px 70px -30px rgba(23,59,51,0.35)",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: GREEN,
        }}
      >
        {/* inner gold hairline frame */}
        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: 20,
            border: `1px solid ${GOLD}66`,
            pointerEvents: "none",
            zIndex: 5,
          }}
        />

        {/* Right: bedroom imagery */}
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 430, overflow: "hidden" }}>
          <img
            src={bedroom}
            alt="Luxury bedding scene"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
          {/* soft cream feather into the left panel */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg, ${CREAM} 0%, ${CREAM}CC 12%, transparent 42%)`,
            }}
          />
        </div>

        {/* Gold ribbon sweep + bow */}
        <svg
          width={CARD_W}
          height={CARD_H}
          viewBox={`0 0 ${CARD_W} ${CARD_H}`}
          style={{ position: "absolute", inset: 0, zIndex: 3 }}
        >
          <defs>
            <linearGradient id="dnGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E7C784" />
              <stop offset="45%" stopColor={GOLD} />
              <stop offset="100%" stopColor="#8C6427" />
            </linearGradient>
          </defs>
          {/* vertical ribbon with gentle curve */}
          <path
            d="M640 0 C600 220, 640 470, 720 700 L800 700 C700 470, 665 220, 700 0 Z"
            fill="url(#dnGold)"
            opacity="0.95"
          />
          {/* bow */}
          <g transform="translate(668,272)">
            <path d="M0 0 C-70 -52, -128 -34, -120 6 C-113 44, -52 44, 0 8 Z" fill="url(#dnGold)" />
            <path d="M0 0 C70 -46, 128 -26, 118 12 C109 48, 48 44, 0 8 Z" fill="url(#dnGold)" />
            <path d="M-6 10 C-46 62, -74 84, -96 96 L-66 108 C-44 88, -20 52, -6 22 Z" fill="url(#dnGold)" opacity="0.9" />
            <path d="M8 10 C48 60, 78 82, 100 94 L70 108 C48 88, 22 52, 8 22 Z" fill="url(#dnGold)" opacity="0.9" />
            <ellipse cx="0" cy="6" rx="20" ry="17" fill="#C79B52" />
          </g>
        </svg>

        {/* Left: content */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 620,
            padding: "44px 56px",
            zIndex: 6,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <img src={logo} alt="DreamNest" style={{ height: 130, marginLeft: -8, objectFit: "contain", objectPosition: "left" }} />
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              letterSpacing: "0.32em",
              color: GOLD,
              fontWeight: 500,
            }}
          >
            BEDDING &amp; HOME DÉCOR
          </div>

          <div
            style={{
              marginTop: 26,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 52,
              lineHeight: 1,
              letterSpacing: "0.05em",
              color: GREEN,
            }}
          >
            GIFT VOUCHER
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0 14px", width: 430 }}>
            <div style={{ height: 1, flex: 1, background: `${GOLD}66` }} />
            <div style={{ width: 7, height: 7, background: GOLD, transform: "rotate(45deg)" }} />
            <div style={{ height: 1, flex: 1, background: `${GOLD}66` }} />
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 34, color: GOLD }}>RF</span>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 76,
                lineHeight: 1,
                color: GOLD,
                fontWeight: 600,
              }}
            >
              {formatAmount(amount)}
            </span>
          </div>

          <div style={{ marginTop: 26, display: "grid", gap: 12, fontSize: 17 }}>
            <Row label="To" value={recipient || "—"} />
            <Row label="From" value={from || "DreamNest"} />
            <Row label="Code" value={code} mono />
            <Row label="Valid until" value={formatDate(validUntil)} />
          </div>

          {message ? (
            <div
              style={{
                marginTop: 18,
                fontStyle: "italic",
                fontSize: 14,
                color: `${GREEN}B3`,
                maxWidth: 420,
                lineHeight: 1.5,
              }}
            >
              “{message}”
            </div>
          ) : null}
        </div>

        {/* Bottom-right info box */}
        <div
          style={{
            position: "absolute",
            right: 42,
            bottom: 44,
            width: 348,
            background: GREEN,
            borderRadius: 20,
            border: `1px solid ${GOLD}80`,
            padding: "20px 22px",
            zIndex: 7,
            color: CREAM,
            textAlign: "center",
            boxShadow: "0 18px 40px -18px rgba(0,0,0,0.55)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
            <Pill icon="store" label="REDEEM IN-STORE" />
            <div style={{ width: 1, height: 40, background: `${GOLD}66` }} />
            <Pill icon="cart" label="OR ONLINE" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 12px" }}>
            <div style={{ height: 1, flex: 1, background: `${GOLD}55` }} />
            <div style={{ width: 6, height: 6, background: GOLD, transform: "rotate(45deg)" }} />
            <div style={{ height: 1, flex: 1, background: `${GOLD}55` }} />
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
            Redeem in-store or online at{" "}
            <span style={{ color: "#E3C185", fontWeight: 600 }}>{website}</span>
            <br />
            This voucher can be used for partial payments.
          </div>
        </div>
      </div>
    );
  },
);
VoucherArtwork.displayName = "VoucherArtwork";

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <span style={{ fontSize: 12, letterSpacing: "0.18em", color: `${GOLD}`, minWidth: 96, textTransform: "uppercase" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? "'JetBrains Mono', ui-monospace, monospace" : "'Playfair Display', Georgia, serif",
          fontSize: mono ? 20 : 21,
          letterSpacing: mono ? "0.18em" : "normal",
          color: GREEN,
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Pill({ icon, label }: { icon: "store" | "cart"; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.4">
        {icon === "store" ? (
          <>
            <path d="M3 9l1.5-5h15L21 9" />
            <path d="M4 9h16v11H4z" />
            <path d="M9 20v-6h6v6" />
          </>
        ) : (
          <>
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="18" cy="20" r="1.4" />
            <path d="M2 3h3l2.6 12h11L21 7H6" />
          </>
        )}
      </svg>
      <span style={{ fontSize: 10.5, letterSpacing: "0.14em", color: CREAM }}>{label}</span>
    </div>
  );
}

/** Responsive wrapper that scales the fixed artwork to the available width. */
export function VoucherCard(props: VoucherCardProps & { artworkRef?: React.Ref<HTMLDivElement> }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CARD_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ width: "100%", height: CARD_H * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: CARD_W, height: CARD_H }}>
        <VoucherArtwork ref={props.artworkRef} {...props} />
      </div>
    </div>
  );
}
