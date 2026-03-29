
-- Business configuration table (one per user, configurable for any business type)
CREATE TABLE public.business_config (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT 'Mi Negocio',
  business_type TEXT DEFAULT 'general',
  description TEXT DEFAULT '',
  services JSONB DEFAULT '[]'::jsonb,
  working_hours JSONB DEFAULT '{"monday":{"start":"09:00","end":"18:00","enabled":true},"tuesday":{"start":"09:00","end":"18:00","enabled":true},"wednesday":{"start":"09:00","end":"18:00","enabled":true},"thursday":{"start":"09:00","end":"18:00","enabled":true},"friday":{"start":"09:00","end":"18:00","enabled":true},"saturday":{"start":"09:00","end":"14:00","enabled":false},"sunday":{"start":"09:00","end":"14:00","enabled":false}}'::jsonb,
  appointment_duration_minutes INT DEFAULT 30,
  welcome_message TEXT DEFAULT '¡Hola! Bienvenido a nuestro servicio. ¿En qué puedo ayudarte?',
  bot_instructions TEXT DEFAULT 'Eres un asistente amable y profesional. Responde preguntas sobre el negocio, ayuda a agendar citas y envía recordatorios.',
  timezone TEXT DEFAULT 'Europe/Madrid',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business config" ON public.business_config FOR ALL USING (auth.uid() = user_id);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_telegram_chat_id BIGINT,
  service TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own appointments" ON public.appointments FOR ALL USING (auth.uid() = user_id);

-- Telegram bot state (polling offset)
CREATE TABLE public.telegram_bot_state (
  id INT PRIMARY KEY CHECK (id = 1),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  update_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bot state" ON public.telegram_bot_state FOR ALL USING (auth.uid() = user_id);

-- Telegram conversations
CREATE TABLE public.telegram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  client_name TEXT,
  client_username TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, chat_id)
);

ALTER TABLE public.telegram_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversations" ON public.telegram_conversations FOR ALL USING (auth.uid() = user_id);

-- Telegram messages
CREATE TABLE public.telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.telegram_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content TEXT,
  raw_update JSONB,
  update_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_telegram_messages_conversation ON public.telegram_messages(conversation_id);
CREATE INDEX idx_telegram_messages_chat ON public.telegram_messages(chat_id);

ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.telegram_messages FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
