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
        Row: { access_code: string; family_code: string | null; id: number; max_seats: number };
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
      surprise: {
        Row: { id: number; ig: string | null; name: string; photo_path: string | null; role: string; stage_path: string | null; updated_at: string; when_text: string };
        Insert: { id?: number; ig?: string | null; name: string; photo_path?: string | null; role: string; stage_path?: string | null; updated_at?: string; when_text: string };
        Update: { id?: number; ig?: string | null; name?: string; photo_path?: string | null; role?: string; stage_path?: string | null; updated_at?: string; when_text?: string };
        Relationships: [];
      };
      rsvps: {
        Row: { created_at: string; email: string | null; first_name: string; id: string; last_name: string; via: string };
        Insert: { created_at?: string; email?: string | null; first_name: string; id: string; last_name: string; via?: string };
        Update: { created_at?: string; email?: string | null; first_name?: string; id?: string; last_name?: string; via?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      area_counts: { Args: never; Returns: { area: number | null; total: number }[] };
      confirm_rsvp: { Args: { p_code: string; p_first: string; p_last: string }; Returns: undefined };
      confirm_rsvp_family: { Args: { p_fam: string; p_first: string; p_last: string }; Returns: undefined };
      party_code_valid: { Args: { p_code: string }; Returns: boolean };
      rsvp_precheck: { Args: { p_code: string }; Returns: string };
      set_my_room: { Args: { p_area: number }; Returns: undefined };
      surprise_allowed: { Args: never; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type GuestPin = Database['public']['Tables']['guest_pins']['Row'];
export type Rsvp = Database['public']['Tables']['rsvps']['Row'];
