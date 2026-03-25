import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CallState {
  isLoading: boolean;
  callLog: any | null;
  error: string | null;
}

export function useSimulateCall() {
  const [callState, setCallState] = useState<CallState>({
    isLoading: false,
    callLog: null,
    error: null,
  });
  const { toast } = useToast();

  const simulateCall = useCallback(async (leadId?: string) => {
    setCallState({ isLoading: true, callLog: null, error: null });

    try {
      const { data, error } = await supabase.functions.invoke("simulate-call", {
        body: { lead_id: leadId || null },
      });

      if (error) throw error;

      setCallState({ isLoading: false, callLog: data.call_log, error: null });

      toast({
        title: "Llamada iniciada",
        description: `Estado: ${data.call_log.status} | ID: ${data.call_log.vapi_call_id}`,
      });

      return data;
    } catch (err: any) {
      const message = err?.message || "Error al iniciar la llamada";
      setCallState({ isLoading: false, callLog: null, error: message });

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });

      return null;
    }
  }, [toast]);

  return { ...callState, simulateCall };
}
