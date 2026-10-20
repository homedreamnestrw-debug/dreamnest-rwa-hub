import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "npm:emailjs@4.0.3";

const TO = "sales@dreamnestrw.com";
const TZ_OFFSET_H = 2; // Africa/Kigali (UTC+2, no DST)

const rwf = (n: number) => `RWF ${Math.round(n).toLocaleString("en-US")}`;
const kigaliNow = () => new Date(Date.now() + TZ_OFFSET_H * 3600_000);
// Kigali midnight of a Y-M-D -> UTC Date
const kigaliMidnight = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m, d) - TZ_OFFSET_H * 3600_000);
const fmt = (d: Date) =>
  new Date(d.getTime() + TZ_OFFSET_H * 3600_000).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const secret = Deno.env.get("PUSH_HOOK_SECRET") ?? "";
  if (!secret || req.headers.get("x-hook-secret") !== secret) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const force = typeof body?.kind === "string" ? body.kind : null; // "weekly" | "monthly" for manual tests

    const k = kigaliNow();
    const y = k.getUTCFullYear(), m = k.getUTCMonth(), d = k.getUTCDate();
    const isSunday = k.getUTCDay() === 0;
    const isLastDay = new Date(Date.UTC(y, m, d + 1)).getUTCDate() === 1;

    const kinds: string[] = [];
    if (force === "weekly" || (!force && isSunday)) kinds.push("weekly");
    if (force === "monthly" || (!force && isLastDay)) kinds.push("monthly");
    if (kinds.length === 0) return json({ sent: 0, reason: "not a digest day" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings } = await supabase.from("business_settings")
      .select("smtp_host, smtp_port, smtp_user, email, business_name").limit(1).maybeSingle();
    const pwd = Deno.env.get("ZOHO_SMTP_PASSWORD");
    if (!pwd) throw new Error("SMTP password missing");
    const smtpUser = settings?.smtp_user || settings?.email || TO;
    const port = settings?.smtp_port || 465;
    const client = new SMTPClient({ user: smtpUser, password: pwd, host: settings?.smtp_host || "smtp.zoho.com", port, ssl: port === 465, tls: port === 587 });

    const end = kigaliMidnight(y, m, d + 1);
    const results: Record<string, unknown> = {};
    for (const kind of kinds) {
      const start = kind === "weekly" ? kigaliMidnight(y, m, d - 6) : kigaliMidnight(y, m, 1);
      const html = await buildDigest(supabase, kind, start, end, settings?.business_name || "DreamNest");
      const label = `${fmt(start)} → ${fmt(new Date(end.getTime() - 1))}`;
      await client.sendAsync({
        from: `${settings?.business_name || "DreamNest"} <${smtpUser}>`,
        to: TO,
        subject: `DreamNest ${kind === "weekly" ? "Weekly" : "Monthly"} Digest — ${label}`,
        text: `DreamNest ${kind} digest ${label}`,
        attachment: [{ data: html, alternative: true }],
      } as any);
      results[kind] = "sent";
    }
    return json({ sent: kinds.length, results });
  } catch (e) {
    console.error("digest error", e);
    return json({ error: "Digest failed" }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function buildDigest(sb: any, kind: string, start: Date, end: Date, brand: string) {
  const s = start.toISOString(), e = end.toISOString();
  const [ordersR, payR, msgR, expR, invR, creditR, eventsR] = await Promise.all([
    sb.from("orders").select("id, order_number, channel, status, payment_status, total, guest_name, customer_id, created_at")
      .gte("created_at", s).lt("created_at", e).neq("status", "cancelled").limit(5000),
    sb.from("credit_payments").select("amount, payment_method, created_at, order_id, orders(order_number, guest_name)")
      .gte("created_at", s).lt("created_at", e).limit(2000),
    sb.from("contact_submissions").select("name, subject, message, is_read, created_at")
      .gte("created_at", s).lt("created_at", e).order("created_at", { ascending: false }).limit(200),
    sb.from("expenses").select("amount, category").gte("expense_date", s.slice(0, 10)).lt("expense_date", e.slice(0, 10)),
    sb.from("invoices").select("document_number, client_name, total, status, paid_at, document_type")
      .eq("document_type", "invoice").gte("paid_at", s).lt("paid_at", e),
    sb.from("orders").select("id, order_number, guest_name, total, payment_status").in("payment_status", ["unpaid", "partial"]).neq("status", "cancelled").limit(5000),
    sb.from("calendar_tasks").select("title, status, completed_at").eq("status", "completed").gte("completed_at", s).lt("completed_at", e).limit(200),
  ]);
  const orders = ordersR.data ?? [];
  const pays = payR.data ?? [];
  const msgs = msgR.data ?? [];
  const exps = expR.data ?? [];
  const invPaid = invR.data ?? [];
  const tasks = eventsR.data ?? [];

  // Outstanding credit = unpaid/partial order totals minus credit payments on them
  const credit = creditR.data ?? [];
  let outstanding = 0;
  const outRows: { label: string; due: number }[] = [];
  if (credit.length) {
    const ids = credit.map((o: any) => o.id);
    const { data: allPays } = await sb.from("credit_payments").select("order_id, amount").in("order_id", ids);
    const paidBy: Record<string, number> = {};
    (allPays ?? []).forEach((p: any) => (paidBy[p.order_id] = (paidBy[p.order_id] ?? 0) + Number(p.amount)));
    for (const o of credit) {
      const due = Math.max(0, Number(o.total) - (paidBy[o.id] ?? 0));
      if (due > 0) { outstanding += due; outRows.push({ label: `#${o.order_number} ${o.guest_name ?? ""}`, due }); }
    }
    outRows.sort((a, b) => b.due - a.due);
  }

  const total = orders.reduce((a: number, o: any) => a + Number(o.total), 0);
  const instore = orders.filter((o: any) => o.channel === "in_store").reduce((a: number, o: any) => a + Number(o.total), 0);
  const online = total - instore;
  const paidSales = orders.filter((o: any) => o.payment_status === "paid").reduce((a: number, o: any) => a + Number(o.total), 0);
  const delivered = orders.filter((o: any) => o.status === "delivered").length;
  const collected = pays.reduce((a: number, p: any) => a + Number(p.amount), 0);
  const expenses = exps.reduce((a: number, x: any) => a + Number(x.amount), 0);

  // Top products
  let topRows = "";
  if (orders.length) {
    const { data: items } = await sb.from("order_items").select("quantity, total, products(name)").in("order_id", orders.map((o: any) => o.id).slice(0, 1000));
    const agg: Record<string, { q: number; t: number }> = {};
    (items ?? []).forEach((i: any) => {
      const n = i.products?.name ?? "Item";
      agg[n] = agg[n] ?? { q: 0, t: 0 };
      agg[n].q += i.quantity; agg[n].t += Number(i.total);
    });
    topRows = Object.entries(agg).sort((a, b) => b[1].t - a[1].t).slice(0, 5)
      .map(([n, v]) => row([esc(n), String(v.q), rwf(v.t)])).join("");
  }

  const card = (l: string, v: string) =>
    `<td style="padding:12px;background:#FAF6EE;border:1px solid #E8DCC2;border-radius:8px;text-align:center"><div style="font-size:11px;color:#7A6A55;text-transform:uppercase">${l}</div><div style="font-size:17px;font-weight:bold;color:#4A3728;margin-top:4px">${v}</div></td>`;
  const section = (t: string, inner: string) =>
    `<h3 style="font-family:Georgia,serif;color:#4A3728;border-bottom:2px solid #D4AF37;padding-bottom:4px;margin-top:28px">${t}</h3>${inner}`;
  const table = (heads: string[], rows: string) => rows
    ? `<table width="100%" cellpadding="6" style="border-collapse:collapse;font-size:13px"><tr>${heads.map((h) => `<th align="left" style="background:#4A3728;color:#fff">${h}</th>`).join("")}</tr>${rows}</table>`
    : `<p style="color:#7A6A55;font-size:13px">Nothing recorded.</p>`;

  return `<!doctype html><html><body style="margin:0;background:#F5F0E8;font-family:Arial,sans-serif">
<div style="max-width:680px;margin:0 auto;background:#fff;padding:28px">
<div style="text-align:center;border-bottom:3px solid #D4AF37;padding-bottom:12px">
<h1 style="font-family:Georgia,serif;color:#4A3728;margin:0">${esc(brand)}</h1>
<div style="color:#7A6A55">${kind === "weekly" ? "Weekly" : "Monthly"} Digest · ${fmt(start)} → ${fmt(new Date(end.getTime() - 1))}</div></div>
<table width="100%" cellspacing="8" style="margin-top:16px"><tr>${card("Sales", rwf(total))}${card("Orders", String(orders.length))}${card("Paid sales", rwf(paidSales))}</tr>
<tr>${card("Credit collected", rwf(collected))}${card("Outstanding credit", rwf(outstanding))}${card("Expenses", rwf(expenses))}</tr></table>
${section("Sales", `<p style="font-size:13px">In-store: <b>${rwf(instore)}</b> · Online: <b>${rwf(online)}</b> · Delivered orders: <b>${delivered}</b> / ${orders.length}</p>${table(["Top products", "Qty", "Revenue"], topRows)}`)}
${section("Who paid (credit payments)", table(["Order / client", "Method", "Amount"], pays.map((p: any) => row([`#${p.orders?.order_number ?? "-"} ${esc(p.orders?.guest_name ?? "")}`, esc(p.payment_method), rwf(Number(p.amount))])).join("")))}
${section("Invoices paid", table(["Invoice", "Client", "Total"], invPaid.map((i: any) => row([esc(i.document_number), esc(i.client_name ?? "-"), rwf(Number(i.total))])).join("")))}
${section(`Outstanding credit (${outRows.length})`, table(["Order / client", "Balance due"], outRows.slice(0, 15).map((o) => row([esc(o.label), rwf(o.due)])).join("")))}
${section(`Tasks finished (${tasks.length})`, table(["Task"], tasks.slice(0, 15).map((t: any) => row([esc(t.title)])).join("")))}
${section(`Messages received (${msgs.length})`, table(["From", "Subject", "Status"], msgs.slice(0, 15).map((mm: any) => row([esc(mm.name), esc(mm.subject ?? (mm.message ?? "").slice(0, 60)), mm.is_read ? "Read" : "Unread"])).join("")))}
<p style="text-align:center;color:#9A8B75;font-size:11px;margin-top:28px">Automated digest from DreamNest admin.</p>
</div></body></html>`;
}

const row = (cells: string[]) => `<tr>${cells.map((c) => `<td style="border-bottom:1px solid #EEE">${c}</td>`).join("")}</tr>`;
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
