const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'npm:emailjs@4.0.3'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { voucher_code, type } = await req.json()
    // type: "purchased" | "approved"

    if (!voucher_code || !type) {
      return new Response(
        JSON.stringify({ error: 'voucher_code and type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Fetch voucher
    const { data: voucher, error: vErr } = await supabase
      .from('gift_vouchers')
      .select('*')
      .eq('code', voucher_code)
      .single()

    if (vErr || !voucher) {
      return new Response(
        JSON.stringify({ error: 'Voucher not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch business settings for SMTP and branding
    const { data: settingsArr } = await supabase.rpc('get_public_business_settings')
    const biz = settingsArr?.[0]

    const { data: smtpSettings } = await supabase
      .from('business_settings')
      .select('smtp_host, smtp_port, smtp_user, email, business_name')
      .limit(1)
      .single()

    const smtpHost = smtpSettings?.smtp_host || 'smtp.zoho.com'
    const smtpPort = smtpSettings?.smtp_port || 465
    const smtpUser = smtpSettings?.smtp_user || smtpSettings?.email || 'sales@dreamnestrw.com'
    const smtpPassword = Deno.env.get('ZOHO_SMTP_PASSWORD')

    if (!smtpPassword) {
      throw new Error('ZOHO_SMTP_PASSWORD is not configured')
    }

    const fromName = smtpSettings?.business_name || 'DreamNest'
    const fromEmail = smtpUser
    const shopEmail = smtpSettings?.email || 'sales@dreamnestrw.com'

    const client = new SMTPClient({
      user: smtpUser,
      password: smtpPassword,
      host: smtpHost,
      port: smtpPort,
      ssl: smtpPort === 465,
      tls: smtpPort === 587,
    })

    // Generate PDF
    const pdfBase64 = generateVoucherPDF(voucher, biz)

    const formatPrice = (n: number) =>
      new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n)

    const expiresDate = new Date(voucher.expires_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    const emails: Array<{ to: string; subject: string; html: string }> = []

    if (type === 'purchased') {
      // 1. Email to SHOP (admin notification)
      emails.push({
        to: shopEmail,
        subject: `🎁 New Gift Voucher Purchase — ${formatPrice(voucher.amount)}`,
        html: buildShopEmail(voucher, formatPrice, fromName),
      })

      // 2. Email to BUYER (purchase confirmation)
      if (voucher.buyer_email) {
        emails.push({
          to: voucher.buyer_email,
          subject: `Your Gift Voucher Purchase Confirmation — ${formatPrice(voucher.amount)}`,
          html: buildBuyerPurchaseEmail(voucher, formatPrice, expiresDate, fromName),
        })
      }
    } else if (type === 'approved') {
      // 1. Email to RECIPIENT (voucher delivery)
      if (voucher.recipient_email) {
        emails.push({
          to: voucher.recipient_email,
          subject: `🎁 You've Received a ${fromName} Gift Voucher!`,
          html: buildRecipientEmail(voucher, formatPrice, expiresDate, fromName),
        })
      }

      // 2. Email to BUYER (approval notification)
      if (voucher.buyer_email) {
        emails.push({
          to: voucher.buyer_email,
          subject: `Your Gift Voucher Has Been Activated — ${voucher.code}`,
          html: buildBuyerApprovalEmail(voucher, formatPrice, expiresDate, fromName),
        })
      }

      // 3. Email to SHOP (approval confirmation)
      emails.push({
        to: shopEmail,
        subject: `✅ Gift Voucher Approved — ${voucher.code}`,
        html: buildShopApprovalEmail(voucher, formatPrice, fromName),
      })
    }

    // Send all emails with PDF attachment
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
    const pdfBuffer = pdfBytes.buffer

    for (const email of emails) {
      try {
        await client.sendAsync({
          from: `${fromName} <${fromEmail}>`,
          to: email.to,
          subject: email.subject,
          attachment: [
            { data: email.html, alternative: true },
            {
              data: new Uint8Array(pdfBuffer),
              type: 'application/pdf',
              name: `DreamNest-Voucher-${voucher.code}.pdf`,
              encoded: false,
            },
          ],
        } as any)
      } catch (e) {
        console.error(`Failed to send email to ${email.to}:`, e)
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: emails.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-voucher-emails error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Email Templates ────────────────────────────────────────

function buildShopEmail(v: any, fp: (n: number) => string, brand: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
    <h2 style="color:#5c4033">🎁 New Gift Voucher Purchase</h2>
    <p><strong>Amount:</strong> ${fp(v.amount)}</p>
    <p><strong>Buyer:</strong> ${v.buyer_name} (${v.buyer_phone || v.buyer_email || 'N/A'})</p>
    <p><strong>Recipient:</strong> ${v.recipient_name} (${v.recipient_email || v.recipient_phone || 'N/A'})</p>
    <p><strong>Payment Method:</strong> ${v.payment_method?.replace('_', ' ')}</p>
    ${v.personal_message ? `<p><strong>Message:</strong> "${v.personal_message}"</p>` : ''}
    <p style="color:#999;font-size:12px;margin-top:24px">This voucher requires payment approval before activation. The PDF voucher is attached.</p>
    <p style="color:#999;font-size:11px">${brand}</p>
  </div>`
}

function buildBuyerPurchaseEmail(v: any, fp: (n: number) => string, expires: string, brand: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
    <h2 style="color:#5c4033">🎁 Thank You for Your Gift Voucher Purchase!</h2>
    <p>Dear ${v.buyer_name},</p>
    <p>Your gift voucher purchase of <strong>${fp(v.amount)}</strong> for <strong>${v.recipient_name}</strong> has been received.</p>
    <div style="text-align:center;padding:20px;margin:20px 0;background:#f9f5f0;border-radius:12px">
      <p style="margin:0;font-size:12px;color:#999">Voucher Code</p>
      <p style="margin:8px 0;font-size:28px;font-weight:bold;letter-spacing:4px;color:#5c4033">${v.code}</p>
      <p style="margin:0;font-size:14px;color:#666">Value: ${fp(v.amount)}</p>
    </div>
    <p><strong>Status:</strong> Pending payment confirmation</p>
    <p>Once your payment is confirmed by our team, the voucher will be activated and your recipient will be notified.</p>
    <p><strong>Expires:</strong> ${expires}</p>
    <p style="color:#999;font-size:12px;margin-top:32px">The voucher PDF is attached to this email. — ${brand}</p>
  </div>`
}

function buildRecipientEmail(v: any, fp: (n: number) => string, expires: string, brand: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
    <h2 style="color:#5c4033">🎁 You've Received a Gift!</h2>
    <p>Dear ${v.recipient_name},</p>
    <p><strong>${v.buyer_name}</strong> has sent you a ${brand} Gift Voucher worth <strong>${fp(v.amount)}</strong>!</p>
    ${v.personal_message ? `<p style="padding:12px;background:#f9f5f0;border-radius:8px;font-style:italic">"${v.personal_message}"</p>` : ''}
    <div style="text-align:center;padding:20px;margin:20px 0;background:#f9f5f0;border-radius:12px">
      <p style="margin:0;font-size:12px;color:#999">Your Voucher Code</p>
      <p style="margin:8px 0;font-size:32px;font-weight:bold;letter-spacing:4px;color:#5c4033">${v.code}</p>
    </div>
    <p>Use this code at checkout on <a href="https://dreamnestrw.com" style="color:#5c4033">dreamnestrw.com</a></p>
    <p style="color:#999;font-size:12px;margin-top:32px">Valid until ${expires}. The voucher PDF is attached. — ${brand}</p>
  </div>`
}

function buildBuyerApprovalEmail(v: any, fp: (n: number) => string, expires: string, brand: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
    <h2 style="color:#5c4033">✅ Your Gift Voucher Is Now Active!</h2>
    <p>Dear ${v.buyer_name},</p>
    <p>Great news! Your payment has been confirmed and the gift voucher for <strong>${v.recipient_name}</strong> is now active.</p>
    <div style="text-align:center;padding:20px;margin:20px 0;background:#f9f5f0;border-radius:12px">
      <p style="margin:0;font-size:12px;color:#999">Voucher Code</p>
      <p style="margin:8px 0;font-size:28px;font-weight:bold;letter-spacing:4px;color:#5c4033">${v.code}</p>
      <p style="margin:0;font-size:14px;color:#666">Value: ${fp(v.amount)} — Expires: ${expires}</p>
    </div>
    ${v.recipient_email ? `<p>We've also notified ${v.recipient_name} via email.</p>` : ''}
    <p style="color:#999;font-size:12px;margin-top:32px">The voucher PDF is attached. — ${brand}</p>
  </div>`
}

function buildShopApprovalEmail(v: any, fp: (n: number) => string, brand: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
    <h2 style="color:#5c4033">✅ Gift Voucher Approved</h2>
    <p><strong>Code:</strong> ${v.code}</p>
    <p><strong>Amount:</strong> ${fp(v.amount)}</p>
    <p><strong>Buyer:</strong> ${v.buyer_name}</p>
    <p><strong>Recipient:</strong> ${v.recipient_name}</p>
    <p>Emails have been sent to ${[v.buyer_email, v.recipient_email].filter(Boolean).join(' and ') || 'N/A'}.</p>
    <p style="color:#999;font-size:11px;margin-top:24px">${brand}</p>
  </div>`
}

// ─── PDF Generator ──────────────────────────────────────────

function generateVoucherPDF(voucher: any, biz: any): string {
  const businessName = biz?.business_name || 'DreamNest'
  const tagline = biz?.tagline || 'Premium Bedding & Home Decor'
  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n)
  const amount = formatPrice(voucher.amount)
  const expiresDate = new Date(voucher.expires_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const lines: string[] = []
  let y = 700

  const addText = (text: string, size: number, x: number, yPos: number) => {
    lines.push(`BT /F1 ${size} Tf ${x} ${yPos} Td (${escPdf(text)}) Tj ET`)
  }

  addText(businessName, 28, 180, y); y -= 30
  addText(tagline, 10, 195, y); y -= 60
  addText('GIFT VOUCHER', 24, 195, y); y -= 50
  addText(amount, 36, 210, y); y -= 50
  addText(`Code: ${voucher.code}`, 16, 215, y); y -= 40
  addText(`To: ${voucher.recipient_name}`, 12, 180, y); y -= 20
  addText(`From: ${voucher.buyer_name}`, 12, 180, y); y -= 30
  if (voucher.personal_message) {
    const msg = voucher.personal_message
    addText(`"${msg.substring(0, 60)}"`, 11, 170, y); y -= 20
    if (msg.length > 60) {
      addText(`"${msg.substring(60, 120)}"`, 11, 170, y); y -= 20
    }
  }
  y -= 20
  addText(`Valid until: ${expiresDate}`, 10, 210, y); y -= 20
  addText('Redeem online at dreamnestrw.com', 10, 190, y); y -= 20
  addText('This voucher can be used for partial payments.', 9, 175, y)

  const stream = lines.join('\n')
  const streamBytes = new TextEncoder().encode(stream)

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

4 0 obj
<< /Length ${streamBytes.length} >>
stream
${stream}
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000${(317 + streamBytes.length).toString().padStart(4, '0')} 00000 n 

trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`

  const bytes = new TextEncoder().encode(pdf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function escPdf(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
