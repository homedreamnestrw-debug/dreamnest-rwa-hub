const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { voucher_code } = await req.json()
    if (!voucher_code) {
      return new Response(JSON.stringify({ error: 'voucher_code required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: voucher, error } = await supabase
      .from('gift_vouchers')
      .select('*')
      .eq('code', voucher_code)
      .single()

    if (error || !voucher) {
      return new Response(JSON.stringify({ error: 'Voucher not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabase.rpc('get_public_business_settings')
    const biz = settings?.[0]

    const formatPrice = (n: number) =>
      new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n)

    const expiresDate = new Date(voucher.expires_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    // Generate a simple HTML-based voucher that we'll convert via a basic approach
    // Since we don't have a PDF library in Deno easily, we'll return an HTML voucher
    // that the client can print or we'll use a simple text-based PDF approach
    
    // Using a minimal PDF generator
    const pdfContent = generateSimplePDF(voucher, biz, formatPrice, expiresDate)

    return new Response(JSON.stringify({ pdf: pdfContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function generateSimplePDF(voucher: any, biz: any, formatPrice: (n: number) => string, expiresDate: string): string {
  // Minimal PDF generation - creates a valid PDF with voucher details
  const businessName = biz?.business_name || 'DreamNest'
  const tagline = biz?.tagline || 'Premium Bedding & Home Decor'
  const amount = formatPrice(voucher.amount)
  const recipientName = voucher.recipient_name || ''
  const buyerName = voucher.buyer_name || ''
  const message = voucher.personal_message || ''
  const code = voucher.code

  // Build PDF manually (minimal valid PDF)
  const lines: string[] = []
  let y = 700

  const addText = (text: string, size: number, x: number, yPos: number) => {
    lines.push(`BT /F1 ${size} Tf ${x} ${yPos} Td (${escPdf(text)}) Tj ET`)
  }

  addText(businessName, 28, 180, y); y -= 30
  addText(tagline, 10, 195, y); y -= 60
  addText('GIFT VOUCHER', 24, 195, y); y -= 50
  addText(amount, 36, 210, y); y -= 50
  addText(`Code: ${code}`, 16, 215, y); y -= 40
  addText(`To: ${recipientName}`, 12, 180, y); y -= 20
  addText(`From: ${buyerName}`, 12, 180, y); y -= 30
  if (message) {
    addText(`"${message.substring(0, 60)}"`, 11, 170, y); y -= 20
    if (message.length > 60) {
      addText(`"${message.substring(60, 120)}"`, 11, 170, y); y -= 20
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

  // Convert to base64
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
