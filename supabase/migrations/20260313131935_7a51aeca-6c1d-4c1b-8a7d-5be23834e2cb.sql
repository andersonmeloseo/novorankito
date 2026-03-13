-- Remove duplicate indexes on audit_logs
-- idx_audit_logs_created is duplicate of idx_audit_logs_created_at
-- idx_audit_logs_user_id is covered by idx_audit_logs_user (user_id, created_at DESC)
DROP INDEX IF EXISTS idx_audit_logs_created;
DROP INDEX IF EXISTS idx_audit_logs_user_id;

-- Remove duplicate index on analytics_sessions
-- idx_analytics_sessions_project is duplicate of idx_analytics_sessions_project_date
DROP INDEX IF EXISTS idx_analytics_sessions_project;

-- Remove duplicate index on app_errors  
-- idx_app_errors_created is duplicate of idx_app_errors_recent
DROP INDEX IF EXISTS idx_app_errors_created;