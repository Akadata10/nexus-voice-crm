import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: corsHeaders });

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY not configured' }), { status: 500, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, chat_id, message, user_id } = await req.json();

    if (action === 'send_message') {
      // Send a manual message from the dashboard
      const sendRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id, text: message }),
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(`Telegram send failed [${sendRes.status}]: ${JSON.stringify(sendData)}`);

      // Get conversation
      const { data: conv } = await supabase
        .from('telegram_conversations')
        .select('id')
        .eq('user_id', user_id)
        .eq('chat_id', chat_id)
        .single();

      // Store outgoing message
      await supabase.from('telegram_messages').insert({
        conversation_id: conv?.id,
        user_id,
        chat_id,
        direction: 'outgoing',
        content: message,
      });

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'send_notification') {
      // Send a notification/reminder to a client
      const sendRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id, text: message, parse_mode: 'HTML' }),
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(`Notification failed [${sendRes.status}]: ${JSON.stringify(sendData)}`);

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'init_bot') {
      // Initialize bot state for a user
      const { error } = await supabase
        .from('telegram_bot_state')
        .upsert({ id: 1, user_id, update_offset: 0, updated_at: new Date().toISOString() }, { onConflict: 'id' });

      if (error) throw new Error(`Init bot error: ${error.message}`);

      // Also create business_config if not exists
      await supabase
        .from('business_config')
        .upsert({ user_id }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({ ok: true, message: 'Bot initialized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('telegram-bot error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
