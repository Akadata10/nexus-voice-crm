import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    const { lead_id } = await req.json();

    // 1. Create call_log entry with status 'initiated'
    const { data: callLog, error: insertError } = await supabase
      .from('call_logs')
      .insert({
        user_id: userId,
        lead_id: lead_id || null,
        status: 'initiated',
        duration_seconds: 0,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create call log: ${insertError.message}`);
    }

    // 2. Simulate Vapi.ai webhook call
    const vapiPayload = {
      call_id: callLog.id,
      type: 'outbound',
      assistant_id: 'nexus-ai-agent',
      customer: lead_id ? { lead_id } : undefined,
      metadata: {
        user_id: userId,
        source: 'nexus-ai-dashboard',
        timestamp: new Date().toISOString(),
      },
    };

    console.log('[Vapi Webhook Simulation] Payload:', JSON.stringify(vapiPayload));

    // 3. Simulate webhook response - update status to 'ringing'
    const { error: updateError } = await supabase
      .from('call_logs')
      .update({
        status: 'ringing',
        vapi_call_id: `vapi_sim_${crypto.randomUUID().slice(0, 8)}`,
      })
      .eq('id', callLog.id);

    if (updateError) {
      throw new Error(`Failed to update call status: ${updateError.message}`);
    }

    // 4. Simulate call connecting after delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { data: updatedLog, error: finalError } = await supabase
      .from('call_logs')
      .update({ status: 'in_progress' })
      .eq('id', callLog.id)
      .select()
      .single();

    if (finalError) {
      throw new Error(`Failed to finalize call status: ${finalError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        call_log: updatedLog,
        vapi_simulation: vapiPayload,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in simulate-call:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
