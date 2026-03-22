import { supabase } from "../lib/supabase";
import type { AppEventType } from "../types/database";

export async function logEvent(
  eventType: AppEventType,
  applicationId?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from("app_events").insert({
      user_id: session.user.id,
      application_id: applicationId || null,
      event_type: eventType,
      meta: meta || null,
    });
  } catch {
    /* log silenciosamente — não propaga erros */
  }
}
