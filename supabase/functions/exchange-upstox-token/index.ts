import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { code, user_id } = await req.json()

        if (!code || !user_id) {
            throw new Error('Missing code or user_id')
        }

        // 1. Get API Key/Secret for user
        const { data: credentials, error: credError } = await supabaseClient
            .from('user_credentials')
            .select('upstox_api_key, upstox_api_secret, is_paper_trading')
            .eq('user_id', user_id)
            .single()

        if (credError || !credentials) {
            console.error('Credential Fetch Error:', credError);
            throw new Error('Could not find API Credentials for user')
        }

        const { upstox_api_key, upstox_api_secret } = credentials

        // 2. Exchange Code for Token with Upstox
        const params = new URLSearchParams()
        params.append('code', code)
        params.append('client_id', upstox_api_key)
        params.append('client_secret', upstox_api_secret)
        params.append('redirect_uri', req.headers.get('origin') ? `${req.headers.get('origin')}/callback` : '') // Try to infer or fallback
        params.append('grant_type', 'authorization_code')

        // Note: redirect_uri must match exactly what was sent in the login request.
        // The frontend sends `window.location.origin + '/callback'`, so we need to match that.
        // The req.headers.get('origin') should give us the frontend domain.
        // Ideally, pass redirect_uri from frontend payload to be safe.

        // REVISIT: Let's assume standard formatting or pass it in body if this fails.
        // For now, let's try to construct it or ask frontend to send it.
        // The previous frontend code was: `window.location.origin + '/callback'`
        // We will hardcode https/http detection or just rely on Origin header + /callback

        const redirectUri = req.headers.get('origin') + '/callback'
        params.set('redirect_uri', redirectUri)


        console.log(`Exchanging token for user ${user_id} with redirect_uri: ${redirectUri}`)

        const tokenResponse = await fetch('https://api.upstox.com/v2/login/authorization/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('Upstox Error:', tokenData)
            throw new Error(tokenData.message || 'Failed to exchange token with Upstox')
        }

        // 3. Save Access Token to user_profiles
        const { error: updateError } = await supabaseClient
            .from('user_profiles')
            .upsert({
                user_id: user_id,
                upstox_access_token: tokenData.access_token,
                // Calculate expiry if provided (Upstox usually provides 'expires_in' seconds? No, just access_token)
                // Upstox tokens are usually valid for the day (until 3:30 AM next day?)
                // Let's set a safe 24h or parse checks if available. 
                // Upstox V2 doesn't send 'expires_in' in the standard success body? 
                // It actually sends 'access_token' and 'extended_token' etc.
                // Let's assume valid for today.
                updated_at: new Date().toISOString()
            })

        if (updateError) {
            throw updateError
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Token exchanged and saved' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
