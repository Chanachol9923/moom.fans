// Hand-written to match supabase/migrations until a local stack is running.
// Once Docker is available, regenerate with:
//   npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
// and keep the exported helper aliases at the bottom.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row, Generated extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required | Generated>> & Partial<Pick<Row, Generated>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  slug: string;
  display_name: string;
  bio: string;
  avatar_path: string | null;
  banner_path: string | null;
  accent_color: string;
  links: Json;
  locale: "th" | "en";
  tip_presets: number[];
  min_tip: number;
  page: Json;
  created_at: string;
  updated_at: string;
};

export type StreamerPrivateRow = {
  streamer_id: string;
  promptpay_type: "phone" | "national_id" | "ewallet";
  promptpay_id: string;
  verify_mode: "manual" | "slipok";
  overlay_token: string;
  control_token: string;
  overlay_channel: string;
  blocked_words: string[];
  updated_at: string;
};

export type OverlayPosition =
  | "top-left" | "top-center" | "top-right" | "center"
  | "bottom-left" | "bottom-center" | "bottom-right";

export type OverlaySettingsRow = {
  streamer_id: string;
  position: OverlayPosition;
  volume: number;
  min_alert_amount: number;
  display_seconds: number;
  alert_sound_path: string | null;
  tts_enabled: boolean;
  tts_voice: string;
  tts_min_amount: number;
  tts_max_chars: number;
  media_enabled: boolean;
  media_baht_per_second: number;
  media_max_seconds: number;
  media_requires_approval: boolean;
  vts_enabled: boolean;
  vts_rules: Json;
  pets_enabled: boolean;
  twitch_channel: string | null;
  alert_style: "card" | "compact" | "banner";
  wheel: Json;
  subathon_seconds_per_baht: number;
  subathon_ends_at: string | null;
  subathon_paused_left: number | null;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  streamer_id: string;
  title: string;
  description: string;
  price: number;
  cover_path: string | null;
  preview_audio_path: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TransactionStatus = "awaiting_payment" | "pending_review" | "verified" | "rejected" | "expired";

export type TransactionRow = {
  id: string;
  streamer_id: string;
  kind: "tip" | "purchase";
  product_id: string | null;
  product_title: string | null;
  supporter_name: string;
  supporter_email: string | null;
  message: string;
  media_url: string | null;
  media_seconds: number | null;
  amount: number;
  status: TransactionStatus;
  verify_method: "manual" | "slipok" | null;
  slip_path: string | null;
  slip_trans_ref: string | null;
  verification: Json | null;
  review_note: string | null;
  public_token: string;
  download_count: number;
  is_anonymous: boolean;
  show_on_wall: boolean;
  unit_qty: number | null;
  poll_id: string | null;
  poll_option: number | null;
  expires_at: string;
  created_at: string;
  submitted_at: string | null;
  verified_at: string | null;
};

export type DownloadRow = {
  id: number;
  transaction_id: string;
  streamer_id: string;
  created_at: string;
};

export type AlertStatus = "held" | "queued" | "playing" | "done" | "skipped";

export type AlertRow = {
  id: string;
  streamer_id: string;
  transaction_id: string | null;
  kind: "tip" | "purchase" | "test";
  status: AlertStatus;
  payload: Json;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type PetRow = {
  id: string;
  streamer_id: string;
  name: string;
  species: string;
  palette: Json;
  sprite: Json | null;
  chatter: string | null;
  is_active: boolean;
  created_at: string;
};

export type GoalRow = {
  id: string;
  streamer_id: string;
  title: string;
  target_amount: number;
  starting_amount: number;
  include_purchases: boolean;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type PollRow = {
  id: string;
  streamer_id: string;
  title: string;
  options: Json;
  weight_by: "amount" | "count";
  is_active: boolean;
  created_at: string;
  closed_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id" | "slug" | "display_name", "created_at" | "updated_at">;
      streamer_private: Table<
        StreamerPrivateRow,
        "streamer_id" | "promptpay_type" | "promptpay_id" | "overlay_token" | "control_token" | "overlay_channel",
        "updated_at"
      >;
      overlay_settings: Table<OverlaySettingsRow, "streamer_id", "updated_at">;
      products: Table<ProductRow, "streamer_id" | "title" | "price", "id" | "created_at" | "updated_at">;
      transactions: Table<
        TransactionRow,
        "streamer_id" | "kind" | "supporter_name" | "amount" | "public_token" | "expires_at",
        "id" | "created_at"
      >;
      downloads: Table<DownloadRow, "transaction_id" | "streamer_id", "id" | "created_at">;
      alerts: Table<AlertRow, "streamer_id" | "kind" | "payload", "id" | "created_at">;
      pets: Table<PetRow, "streamer_id" | "name" | "species", "id" | "created_at">;
      goals: Table<GoalRow, "streamer_id" | "title" | "target_amount", "id" | "created_at">;
      polls: Table<PollRow, "streamer_id" | "title" | "options", "id" | "created_at">;
    };
    Views: { [_ in never]: never };
    Functions: {
      subathon_add: { Args: { p_streamer: string; p_seconds: number }; Returns: undefined };
      goal_raised: { Args: { p_goal: string }; Returns: number };
      top_supporters: {
        Args: { p_streamer: string; p_since: string | null; p_limit: number };
        Returns: { name: string; total: number }[];
      };
      poll_totals: { Args: { p_poll: string }; Returns: { option: number; total: number }[] };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
