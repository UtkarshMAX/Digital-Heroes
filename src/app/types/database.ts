export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      charities: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          featured: boolean;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          short_description: string;
          slug: string;
          upcoming_events: Json;
          updated_at: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          short_description: string;
          slug: string;
          upcoming_events?: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["charities"]["Insert"]>;
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          role: "member" | "admin";
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          role?: "member" | "admin";
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          canceled_at: string | null;
          created_at: string;
          id: string;
          plan_code: "monthly" | "yearly";
          provider: string;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          renewal_at: string | null;
          status: "trialing" | "active" | "past_due" | "canceled" | "lapsed";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          canceled_at?: string | null;
          created_at?: string;
          id?: string;
          plan_code: "monthly" | "yearly";
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          renewal_at?: string | null;
          status: "trialing" | "active" | "past_due" | "canceled" | "lapsed";
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      user_charity_preferences: {
        Row: {
          charity_id: string;
          contribution_percent: number;
          created_at: string;
          id: string;
          independent_donation_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          charity_id: string;
          contribution_percent: number;
          created_at?: string;
          id?: string;
          independent_donation_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_charity_preferences"]["Insert"]>;
      };
      golf_scores: {
        Row: {
          course_name: string;
          created_at: string;
          id: string;
          played_on: string;
          score: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          course_name: string;
          created_at?: string;
          id?: string;
          played_on: string;
          score: number;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["golf_scores"]["Insert"]>;
      };
      draw_runs: {
        Row: {
          created_at: string;
          created_by: string | null;
          draw_mode: "random" | "weighted";
          id: string;
          jackpot_pool_cents: number;
          month_key: string;
          published_at: string | null;
          status: "draft" | "simulated" | "published";
          tier_3_pool_cents: number;
          tier_4_pool_cents: number;
          updated_at: string;
          winning_numbers: number[];
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          draw_mode: "random" | "weighted";
          id?: string;
          jackpot_pool_cents?: number;
          month_key: string;
          published_at?: string | null;
          status: "draft" | "simulated" | "published";
          tier_3_pool_cents?: number;
          tier_4_pool_cents?: number;
          updated_at?: string;
          winning_numbers?: number[];
        };
        Update: Partial<Database["public"]["Tables"]["draw_runs"]["Insert"]>;
      };
      draw_entries: {
        Row: {
          charity_cents: number;
          created_at: string;
          draw_run_id: string;
          id: string;
          match_count: number;
          prize_cents: number;
          score_snapshot: number[];
          user_id: string;
        };
        Insert: {
          charity_cents?: number;
          created_at?: string;
          draw_run_id: string;
          id?: string;
          match_count?: number;
          prize_cents?: number;
          score_snapshot: number[];
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["draw_entries"]["Insert"]>;
      };
      winner_claims: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          draw_entry_id: string;
          id: string;
          payout_status: "pending" | "paid";
          proof_file_path: string | null;
          review_status: "pending" | "approved" | "rejected";
          reviewed_at: string | null;
          reviewed_by: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          draw_entry_id: string;
          id?: string;
          payout_status?: "pending" | "paid";
          proof_file_path?: string | null;
          review_status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["winner_claims"]["Insert"]>;
      };
    };
  };
};
