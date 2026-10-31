// Gerado a partir do projeto site-aniv-2027 (supabase gen types). Regerar se o schema mudar.
export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      areas: {
        Row: { id: number; name: string; slug: string; sort_order: number };
        Insert: { id: number; name: string; slug: string; sort_order?: number };
        Update: { id?: number; name?: string; slug?: string; sort_order?: number };
        Relationships: [];
      };
      guest_pins: {
        Row: { created_at: string; display_name: string; room: number | null; user_id: string; visible: boolean };
        Insert: { created_at?: string; display_name: string; room?: number | null; user_id: string; visible?: boolean };
        Update: { created_at?: string; display_name?: string; room?: number | null; user_id?: string; visible?: boolean };
        Relationships: [];
      };
      party_config: {
        Row: { access_code: string; id: number; max_seats: number };
        Insert: { access_code: string; id?: number; max_seats: number };
        Update: { access_code?: string; id?: number; max_seats?: number };
        Relationships: [];
      };
      questions: {
        Row: { asker_email: string; asker_name: string | null; body: string; created_at: string; id: string; party_code: string };
        Insert: { asker_email: string; asker_name?: string | null; body: string; created_at?: string; id?: string; party_code: string };
        Update: { asker_email?: string; asker_name?: string | null; body?: string; created_at?: string; id?: string; party_code?: string };
        Relationships: [];
      };
      rsvps: {
        Row: { created_at: string; email: string; first_name: string; id: string; last_name: string };
        Insert: { created_at?: string; email: string; first_name: string; id: string; last_name: string };
        Update: { created_at?: string; email?: string; first_name?: string; id?: string; last_name?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      area_counts: { Args: never; Returns: { area: number | null; total: number }[] };
      confirm_rsvp: { Args: { p_code: string; p_first: string; p_last: string }; Returns: undefined };
      party_code_valid: { Args: { p_code: string }; Returns: boolean };
      rsvp_precheck: { Args: { p_code: string }; Returns: string };
      set_my_room: { Args: { p_area: number }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type GuestPin = Database['public']['Tables']['guest_pins']['Row'];
export type Rsvp = Database['public']['Tables']['rsvps']['Row'];
