import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: corsHeaders });

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY not configured' }), { status: 500, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;

  // Get bot state - for now we use a single-user approach (id=1)
  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset, user_id')
    .eq('id', 1)
    .single();

  if (stateErr || !state) {
    return new Response(JSON.stringify({ error: 'No bot state found. Initialize bot first.', details: stateErr?.message }), { status: 500, headers: corsHeaders });
  }

  let currentOffset = state.update_offset;
  const ownerUserId = state.user_id;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    try {
      const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offset: currentOffset, timeout, allowed_updates: ['message'] }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Telegram API error:', data);
        break;
      }

      const updates = data.result ?? [];
      if (updates.length === 0) continue;

      for (const update of updates) {
        if (!update.message) continue;

        const msg = update.message;
        const chatId = msg.chat.id;
        const text = msg.text ?? '';
        const firstName = msg.from?.first_name ?? 'Usuario';
        const username = msg.from?.username ?? null;

        // Upsert conversation
        const { data: conv } = await supabase
          .from('telegram_conversations')
          .upsert({
            user_id: ownerUserId,
            chat_id: chatId,
            client_name: firstName,
            client_username: username,
            last_message_at: new Date().toISOString(),
            is_active: true,
          }, { onConflict: 'user_id,chat_id' })
          .select('id')
          .single();

        // Store incoming message
        await supabase.from('telegram_messages').insert({
          conversation_id: conv?.id,
          user_id: ownerUserId,
          chat_id: chatId,
          direction: 'incoming',
          content: text,
          raw_update: update,
          update_id: update.update_id,
        });

        // Get business config for AI context
        const { data: config } = await supabase
          .from('business_config')
          .select('*')
          .eq('user_id', ownerUserId)
          .single();

        // Get recent conversation history for context
        const { data: history } = await supabase
          .from('telegram_messages')
          .select('direction, content')
          .eq('chat_id', chatId)
          .eq('user_id', ownerUserId)
          .order('created_at', { ascending: false })
          .limit(10);

        const conversationHistory = (history ?? []).reverse().map(m => ({
          role: m.direction === 'incoming' ? 'user' : 'assistant',
          content: m.content ?? '',
        }));

        // Get today's appointments for availability context
        const today = new Date().toISOString().split('T')[0];
        const { data: todayAppts } = await supabase
          .from('appointments')
          .select('scheduled_at, duration_minutes, service, status')
          .eq('user_id', ownerUserId)
          .gte('scheduled_at', `${today}T00:00:00`)
          .lte('scheduled_at', `${today}T23:59:59`)
          .eq('status', 'confirmed');

        const apptContext = (todayAppts ?? []).map(a => 
          `- ${new Date(a.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${a.service ?? 'Cita'} (${a.duration_minutes}min)`
        ).join('\n');

        // Build AI system prompt
        const businessName = config?.business_name ?? 'Mi Negocio';
        const services = config?.services ?? [];
        const workingHours = config?.working_hours ?? {};
        const botInstructions = config?.bot_instructions ?? 'Eres un asistente amable y profesional.';

        const systemPrompt = `${botInstructions}

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${businessName}
- Tipo: ${config?.business_type ?? 'general'}
- Descripción: ${config?.description ?? 'Sin descripción'}
- Teléfono: ${config?.phone ?? 'No disponible'}
- Dirección: ${config?.address ?? 'No disponible'}
- Servicios: ${JSON.stringify(services)}
- Horario: ${JSON.stringify(workingHours)}
- Duración estándar de cita: ${config?.appointment_duration_minutes ?? 30} minutos

CITAS DE HOY:
${apptContext || 'No hay citas programadas'}

INSTRUCCIONES:
- Responde en el mismo idioma que el cliente.
- Si el cliente quiere agendar una cita, pregunta fecha, hora y servicio.
- Cuando confirmes una cita, responde EXACTAMENTE con este formato en una línea separada:
  [CITA_CONFIRMADA:YYYY-MM-DDTHH:MM:servicio:nombre_cliente]
- No inventes horarios ocupados, solo menciona los que están en la lista.
- Sé breve y directo en las respuestas.
- Si no puedes resolver algo, sugiere llamar al negocio.`;

        // Call AI
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
            ],
          }),
        });

        let replyText = 'Lo siento, no puedo responder en este momento. Por favor intenta más tarde.';

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          replyText = aiData.choices?.[0]?.message?.content ?? replyText;

          // Check if AI confirmed an appointment
          const apptMatch = replyText.match(/\[CITA_CONFIRMADA:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):([^:]+):([^\]]+)\]/);
          if (apptMatch) {
            const [_, dateTime, service, clientName] = apptMatch;
            await supabase.from('appointments').insert({
              user_id: ownerUserId,
              client_name: clientName.trim(),
              client_telegram_chat_id: chatId,
              service: service.trim(),
              scheduled_at: `${dateTime}:00+00:00`,
              duration_minutes: config?.appointment_duration_minutes ?? 30,
              status: 'confirmed',
            });
            // Clean the tag from the reply
            replyText = replyText.replace(/\[CITA_CONFIRMADA:[^\]]+\]/, '').trim();
          }
        } else {
          const errText = await aiResponse.text();
          console.error('AI error:', aiResponse.status, errText);
        }

        // Send reply via Telegram
        const sendRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: 'HTML' }),
        });

        if (!sendRes.ok) {
          const errData = await sendRes.json();
          console.error('Send message error:', errData);
        }

        // Store outgoing message
        await supabase.from('telegram_messages').insert({
          conversation_id: conv?.id,
          user_id: ownerUserId,
          chat_id: chatId,
          direction: 'outgoing',
          content: replyText,
        });

        totalProcessed++;
      }

      const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
      await supabase
        .from('telegram_bot_state')
        .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
        .eq('id', 1);
      currentOffset = newOffset;

    } catch (err) {
      console.error('Poll loop error:', err);
      break;
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
