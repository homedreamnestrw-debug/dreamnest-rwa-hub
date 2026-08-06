const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildVoucherPdf } from '../_shared/voucherPdf.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Require authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const callerId = claimsData.claims.sub as string
    const callerEmail = (claimsData.claims as any).email as string | undefined

    const { voucher_code } = await req.json()
    if (!voucher_code) {
      return new Response(JSON.stringify({ error: 'voucher_code required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    // Authorize: must be admin/staff, or the buyer of this voucher
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
    const roles = (roleRows ?? []).map((r: any) => r.role)
    const isStaff = roles.includes('admin') || roles.includes('staff')
    const isBuyer = callerEmail && voucher.buyer_email &&
      callerEmail.toLowerCase() === String(voucher.buyer_email).toLowerCase()
    if (!isStaff && !isBuyer) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabase.rpc('get_public_business_settings')
    const biz = settings?.[0]

    const pdfContent = buildVoucherPdf(voucher, biz)

    return new Response(JSON.stringify({ pdf: pdfContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return new Response(JSON.stringify({ error: 'PDF generation failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
