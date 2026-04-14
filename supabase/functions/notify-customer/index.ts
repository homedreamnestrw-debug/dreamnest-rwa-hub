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
    // Authenticate the caller - require a valid user JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { to, subject, html, text } = await req.json()

    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, and html or text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read SMTP settings from business_settings using service role
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('smtp_host, smtp_port, smtp_user, email, business_name')
      .limit(1)
      .single()

    if (settingsError || !settings) {
      throw new Error('Could not load business settings: ' + (settingsError?.message || 'no data'))
    }

    const smtpHost = settings.smtp_host || 'smtp.zoho.com'
    const smtpPort = settings.smtp_port || 465
    const smtpUser = settings.smtp_user || settings.email || 'sales@dreamnestrw.com'
    const smtpPassword = Deno.env.get('ZOHO_SMTP_PASSWORD')

    if (!smtpPassword) {
      throw new Error('SMTP password is not configured')
    }

    const fromName = settings.business_name || 'DreamNest'
    const fromEmail = smtpUser

    const client = new SMTPClient({
      user: smtpUser,
      password: smtpPassword,
      host: smtpHost,
      port: smtpPort,
      ssl: smtpPort === 465,
      tls: smtpPort === 587,
    })

    const message: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
    }

    if (html) message.attachment = [{ data: html, alternative: true }]
    if (text && !html) message.text = text

    await client.sendAsync(message as any)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Email send error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
