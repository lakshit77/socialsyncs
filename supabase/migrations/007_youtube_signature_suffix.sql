-- Adds deterministic per-video reply signature configuration.
ALTER TABLE public.youtube_automation_configs
ADD COLUMN signature_suffix TEXT NOT NULL DEFAULT '— Lakshit''s AI Agent 🤖';
