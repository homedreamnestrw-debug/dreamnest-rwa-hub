// Premium DreamNest gift voucher PDF (vector, landscape DL ratio 1050x700 -> 600x400pt)
// Matches the on-site VoucherCard design: cream, warm gold, dark forest green.

const CREAM = [0.972, 0.961, 0.937];
const GOLD = [0.710, 0.541, 0.271];
const GOLD_LIGHT = [0.906, 0.780, 0.518];
const GREEN = [0.090, 0.231, 0.200];

const W = 600;
const H = 400;

const esc = (s: string) =>
  String(s ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// Strip characters outside WinAnsi-safe range to avoid mojibake in base14 fonts
const ascii = (s: string) =>
  String(s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/É/g, "E")
    .replace(/[^\x20-\x7E]/g, "");

type Font = "S" | "SB" | "H" | "HB";

class Canvas {
  private ops: string[] = [];

  fill(c: number[]) {
    this.ops.push(`${c[0]} ${c[1]} ${c[2]} rg`);
    return this;
  }
  stroke(c: number[]) {
    this.ops.push(`${c[0]} ${c[1]} ${c[2]} RG`);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, mode = "f") {
    this.ops.push(`${x} ${y} ${w} ${h} re ${mode}`);
    return this;
  }
  roundRect(x: number, y: number, w: number, h: number, r: number, mode = "f") {
    const k = r * 0.5523;
    this.ops.push(
      `${x + r} ${y} m`,
      `${x + w - r} ${y} l`,
      `${x + w - r + k} ${y} ${x + w} ${y + r - k} ${x + w} ${y + r} c`,
      `${x + w} ${y + h - r} l`,
      `${x + w} ${y + h - r + k} ${x + w - r + k} ${y + h} ${x + w - r} ${y + h} c`,
      `${x + r} ${y + h} l`,
      `${x + r - k} ${y + h} ${x} ${y + h - r + k} ${x} ${y + h - r} c`,
      `${x} ${y + r} l`,
      `${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y} c`,
      mode,
    );
    return this;
  }
  line(x1: number, y1: number, x2: number, y2: number, width = 0.6) {
    this.ops.push(`${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
    return this;
  }
  diamond(cx: number, cy: number, s: number) {
    this.ops.push(
      `${cx} ${cy + s} m ${cx + s} ${cy} l ${cx} ${cy - s} l ${cx - s} ${cy} l f`,
    );
    return this;
  }
  path(d: string, mode = "f") {
    this.ops.push(d, mode);
    return this;
  }
  text(t: string, x: number, y: number, size: number, font: Font, color: number[], spacing = 0) {
    this.ops.push(
      `BT ${color[0]} ${color[1]} ${color[2]} rg /${font} ${size} Tf ${spacing} Tc ${x} ${y} Td (${esc(ascii(t))}) Tj ET`,
    );
    return this;
  }
  textCenter(t: string, cx: number, y: number, size: number, font: Font, color: number[], spacing = 0) {
    const clean = ascii(t);
    const width = clean.length * size * (font === "H" || font === "HB" ? 0.5 : 0.52) + spacing * clean.length;
    return this.text(clean, cx - width / 2, y, size, font, color, spacing);
  }
  out() {
    return this.ops.join("\n");
  }
}

export interface VoucherPdfData {
  code: string;
  amount: number;
  recipient_name?: string | null;
  buyer_name?: string | null;
  personal_message?: string | null;
  expires_at: string;
}

export function buildVoucherPdf(v: VoucherPdfData, biz?: any): string {
  const website = "dreamnestrw.com";
  const brand = biz?.business_name || "DreamNest";
  const amount = new Intl.NumberFormat("en-US").format(Number(v.amount) || 0);
  const expires = new Date(v.expires_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const c = new Canvas();

  // Background
  c.fill(CREAM).rect(0, 0, W, H);

  // Right-hand tinted panel (stands in for the bedding scene)
  c.fill([0.925, 0.906, 0.871]).rect(W - 246, 0, 246, H);
  c.fill([0.898, 0.874, 0.831]).rect(W - 246, 0, 246, 150);

  // Gold ribbon sweep
  c.fill(GOLD).path(
    `366 400 m 343 274 366 131 411 0 c 457 0 l 400 131 380 274 411 400 c h`,
  );
  c.fill(GOLD_LIGHT).path(`366 400 m 343 274 366 131 411 0 c 423 0 l 388 131 366 274 383 400 c h`);

  // Bow
  const bx = 382, by = 245;
  c.fill(GOLD)
    .path(`${bx} ${by} m ${bx - 40} ${by + 30} ${bx - 73} ${by + 20} ${bx - 68} ${by - 4} c ${bx - 64} ${by - 26} ${bx - 30} ${by - 26} ${bx} ${by - 5} c h`)
    .path(`${bx} ${by} m ${bx + 40} ${by + 26} ${bx + 73} ${by + 15} ${bx + 67} ${by - 7} c ${bx + 62} ${by - 28} ${bx + 27} ${by - 25} ${bx} ${by - 5} c h`)
    .path(`${bx - 4} ${by - 6} m ${bx - 27} ${by - 36} ${bx - 43} ${by - 48} ${bx - 55} ${by - 55} c ${bx - 38} ${by - 62} l ${bx - 25} ${by - 50} ${bx - 12} ${by - 30} ${bx - 4} ${by - 13} c h`)
    .path(`${bx + 5} ${by - 6} m ${bx + 28} ${by - 34} ${bx + 45} ${by - 47} ${bx + 57} ${by - 54} c ${bx + 40} ${by - 62} l ${bx + 27} ${by - 50} ${bx + 13} ${by - 30} ${bx + 5} ${by - 13} c h`);
  c.fill([0.78, 0.61, 0.32]).path(
    `${bx} ${by - 8} m ${bx + 11} ${by - 8} ${bx + 11} ${by + 8} ${bx} ${by + 8} c ${bx - 11} ${by + 8} ${bx - 11} ${by - 8} ${bx} ${by - 8} c h`,
  );

  // Gold hairline frame
  c.stroke(GOLD);
  c.roundRect(8, 8, W - 16, H - 16, 12, "S");

  // ── Left content ───────────────────────────────
  const L = 34;
  c.text(brand.toUpperCase(), L, H - 56, 26, "HB", GREEN, 1.6);
  c.text("BEDDING & HOME DECOR", L, H - 76, 7.5, "S", GOLD, 2.4);

  c.text("GIFT VOUCHER", L, H - 118, 27, "H", GREEN, 1.2);

  // divider
  c.stroke(GOLD).line(L, H - 134, L + 105, H - 134);
  c.fill(GOLD).diamond(L + 116, H - 131, 3);
  c.stroke(GOLD).line(L + 127, H - 134, L + 232, H - 134);

  c.text("RF", L, H - 178, 18, "H", GOLD);
  c.text(amount, L + 26, H - 186, 40, "HB", GOLD);

  const rows: Array<[string, string]> = [
    ["TO", v.recipient_name || "-"],
    ["FROM", v.buyer_name || brand],
    ["CODE", v.code],
    ["VALID UNTIL", expires],
  ];
  let ry = H - 218;
  for (const [label, value] of rows) {
    c.text(label, L, ry, 7.5, "S", GOLD, 1.6);
    c.text(value, L + 74, ry - 1, 12.5, "HB", GREEN, label === "CODE" ? 2 : 0);
    ry -= 20;
  }

  if (v.personal_message) {
    const msg = ascii(v.personal_message);
    const first = msg.substring(0, 58);
    const second = msg.length > 58 ? msg.substring(58, 116) : "";
    c.text(`"${first}${second ? "" : '"'}`, L, ry - 4, 9, "SB", GREEN);
    if (second) c.text(`${second}"`, L, ry - 16, 9, "SB", GREEN);
  }

  // ── Redeem info box (bottom right) ─────────────
  const bw = 200, bh = 108, bxx = W - bw - 24, byy = 26;
  c.fill(GREEN).roundRect(bxx, byy, bw, bh, 12, "f");
  c.stroke(GOLD);
  c.roundRect(bxx + 3, byy + 3, bw - 6, bh - 6, 10, "S");

  // simple gold glyphs
  c.stroke(GOLD);
  c.path(`${bxx + 38} ${byy + bh - 22} m ${bxx + 42} ${byy + bh - 14} l ${bxx + 58} ${byy + bh - 14} l ${bxx + 62} ${byy + bh - 22} l h`, "S");
  c.rect(bxx + 40, byy + bh - 36, 20, 14, "S");
  c.path(`${bxx + 118} ${byy + bh - 14} m ${bxx + 124} ${byy + bh - 14} l ${bxx + 130} ${byy + bh - 32} l ${bxx + 152} ${byy + bh - 32} l`, "S");
  c.rect(bxx + 128, byy + bh - 38, 3, 3, "S");
  c.rect(bxx + 146, byy + bh - 38, 3, 3, "S");

  c.textCenter("REDEEM IN-STORE", bxx + 50, byy + bh - 48, 6.5, "S", CREAM, 0.8);
  c.textCenter("OR ONLINE", bxx + 137, byy + bh - 48, 6.5, "S", CREAM, 0.8);
  c.stroke([0.710, 0.541, 0.271]).line(bxx + 22, byy + bh - 58, bxx + bw - 22, byy + bh - 58);

  c.textCenter("Redeem in-store or online at", bxx + bw / 2, byy + 34, 8, "S", CREAM);
  c.textCenter(website, bxx + bw / 2, byy + 23, 8.5, "SB", GOLD_LIGHT);
  c.textCenter("Usable for partial payments.", bxx + bw / 2, byy + 11, 7.5, "S", CREAM);

  return assemblePdf(c.out());
}

function assemblePdf(content: string): string {
  const stream = content;
  const streamBytes = new TextEncoder().encode(stream);

  const objs: string[] = [];
  objs.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objs.push(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  objs.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /S 5 0 R /SB 6 0 R /H 7 0 R /HB 8 0 R >> >> >>`,
  );
  objs.push(`<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);
  objs.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  objs.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>`);
  objs.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>`);
  objs.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  const byteLen = (s: string) => new TextEncoder().encode(s).length;

  objs.forEach((body, i) => {
    offsets.push(byteLen(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefPos = byteLen(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const bytes = new TextEncoder().encode(pdf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
