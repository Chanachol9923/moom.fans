-- Designed looks for OBS widgets, and looks streamers save as their own presets.
--
-- overlay_settings.widget_looks: { "goal": <GoalLook> } (more widgets can join later).
-- overlay_settings.look_presets: up to 48 of { "id", "kind": "alert" | "goal", "name", "look" }.
-- Both are validated in the app (packages/shared/src/goal-look.ts, presets.ts); the checks
-- here only bound their shape and size.

alter table public.overlay_settings
  add column widget_looks jsonb not null default '{}'::jsonb
    check (jsonb_typeof(widget_looks) = 'object' and octet_length(widget_looks::text) <= 40000),
  add column look_presets jsonb not null default '[]'::jsonb
    check (jsonb_typeof(look_presets) = 'array' and jsonb_array_length(look_presets) <= 48
           and octet_length(look_presets::text) <= 200000);
