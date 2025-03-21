export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_endpoints: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          created_at: string
          id: string
          is_active: boolean | null
          model: string | null
          name: string
          provider: string
          request_template: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model?: string | null
          name: string
          provider: string
          request_template?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model?: string | null
          name?: string
          provider?: string
          request_template?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assistant_functions: {
        Row: {
          assistant_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          parameters: Json
          updated_at: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parameters?: Json
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parameters?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_functions_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_tools: {
        Row: {
          assistant_id: string
          created_at: string
          enabled: boolean
          id: string
          tool_type: string
          updated_at: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          tool_type: string
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          tool_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_tools_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      assistants: {
        Row: {
          created_at: string
          deployment: string
          id: string
          instructions: string | null
          max_tokens: number
          name: string
          temperature: number
          top_p: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deployment: string
          id?: string
          instructions?: string | null
          max_tokens?: number
          name: string
          temperature?: number
          top_p?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deployment?: string
          id?: string
          instructions?: string | null
          max_tokens?: number
          name?: string
          temperature?: number
          top_p?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_favorite: boolean | null
          message_count: number
          messages: Json
          preview: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          message_count: number
          messages: Json
          preview: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          message_count?: number
          messages?: Json
          preview?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          document_id: string | null
          id: string
          name: string
          size: number
          type: string
          upload_date: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          document_id?: string | null
          id?: string
          name: string
          size: number
          type: string
          upload_date?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          document_id?: string | null
          id?: string
          name?: string
          size?: number
          type?: string
          upload_date?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          azure_api_key: string | null
          azure_deployment_name: string | null
          azure_endpoint_url: string | null
          azure_search_endpoint: string | null
          azure_search_index_name: string | null
          azure_search_key: string | null
          created_at: string | null
          id: string
          instructions: string | null
          max_tokens: number | null
          model: string | null
          request_template: Json | null
          response_sources: Json | null
          temperature: number | null
          updated_at: string | null
          use_azure: boolean | null
          user_id: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          azure_api_key?: string | null
          azure_deployment_name?: string | null
          azure_endpoint_url?: string | null
          azure_search_endpoint?: string | null
          azure_search_index_name?: string | null
          azure_search_key?: string | null
          created_at?: string | null
          id?: string
          instructions?: string | null
          max_tokens?: number | null
          model?: string | null
          request_template?: Json | null
          response_sources?: Json | null
          temperature?: number | null
          updated_at?: string | null
          use_azure?: boolean | null
          user_id: string
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          azure_api_key?: string | null
          azure_deployment_name?: string | null
          azure_endpoint_url?: string | null
          azure_search_endpoint?: string | null
          azure_search_index_name?: string | null
          azure_search_key?: string | null
          created_at?: string | null
          id?: string
          instructions?: string | null
          max_tokens?: number | null
          model?: string | null
          request_template?: Json | null
          response_sources?: Json | null
          temperature?: number | null
          updated_at?: string | null
          use_azure?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
