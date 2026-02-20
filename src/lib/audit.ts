import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "user.login"
  | "user.signup"
  | "user.logout"
  | "api_key.created"
  | "api_key.deleted"
  | "webhook.created"
  | "webhook.deleted"
  | "indexing.submitted"
  | "sync.started"
  | "settings.updated"
  | "member.invited"
  | "member.removed";

interface AuditLogParams {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  detail?: string;
  userId?: string;
}

/**
 * Log an audit event. Fire-and-forget — never blocks UI.
 */
export function logAudit({ action, entityType, entityId, detail, userId }: AuditLogParams) {
  // Fire and forget
  supabase
    .from("audit_logs")
    .insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      detail,
      user_id: userId,
      status: "success",
    })
    .then(({ error }) => {
      if (error) console.warn("Audit log failed:", error.message);
    });
}
