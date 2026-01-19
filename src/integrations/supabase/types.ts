export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      code_runs: {
        Row: {
          block_id: string | null
          code: string
          created_at: string
          id: string
          language: Database["public"]["Enums"]["code_language"]
          note_id: string
          stderr: string | null
          stdout: string | null
        }
        Insert: {
          block_id?: string | null
          code: string
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["code_language"]
          note_id: string
          stderr?: string | null
          stdout?: string | null
        }
        Update: {
          block_id?: string | null
          code?: string
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["code_language"]
          note_id?: string
          stderr?: string | null
          stdout?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_runs_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "note_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_runs_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_edges: {
        Row: {
          created_at: string
          from_concept_id: string
          id: string
          relation: Database["public"]["Enums"]["relation_type"]
          to_concept_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_concept_id: string
          id?: string
          relation?: Database["public"]["Enums"]["relation_type"]
          to_concept_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_concept_id?: string
          id?: string
          relation?: Database["public"]["Enums"]["relation_type"]
          to_concept_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_edges_from_concept_id_fkey"
            columns: ["from_concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_edges_to_concept_id_fkey"
            columns: ["to_concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["concept_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type?: Database["public"]["Enums"]["concept_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["concept_type"]
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          concept_id: string | null
          created_at: string
          due_date: string
          ease: number | null
          front: string
          id: string
          interval_days: number | null
          user_id: string
        }
        Insert: {
          back: string
          concept_id?: string | null
          created_at?: string
          due_date?: string
          ease?: number | null
          front: string
          id?: string
          interval_days?: number | null
          user_id: string
        }
        Update: {
          back?: string
          concept_id?: string | null
          created_at?: string
          due_date?: string
          ease?: number | null
          front?: string
          id?: string
          interval_days?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      note_blocks: {
        Row: {
          content_json: Json
          created_at: string
          id: string
          note_id: string
          order_index: number
          type: Database["public"]["Enums"]["block_type"]
        }
        Insert: {
          content_json?: Json
          created_at?: string
          id?: string
          note_id: string
          order_index?: number
          type?: Database["public"]["Enums"]["block_type"]
        }
        Update: {
          content_json?: Json
          created_at?: string
          id?: string
          note_id?: string
          order_index?: number
          type?: Database["public"]["Enums"]["block_type"]
        }
        Relationships: [
          {
            foreignKeyName: "note_blocks_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content_markdown: string | null
          created_at: string
          id: string
          notebook_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_markdown?: string | null
          created_at?: string
          id?: string
          notebook_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_markdown?: string | null
          created_at?: string
          id?: string
          notebook_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_correct: boolean | null
          prompt: string
          quiz_id: string
          user_answer: string | null
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          prompt: string
          quiz_id: string
          user_answer?: string | null
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          prompt?: string
          quiz_id?: string
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_items_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["quiz_mode"]
          note_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["quiz_mode"]
          note_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["quiz_mode"]
          note_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      block_type: "text" | "math" | "code" | "pdf_ref" | "image_ref"
      code_language: "python" | "r" | "cpp" | "matlab_pseudo"
      concept_type: "concept" | "formula" | "code" | "experiment"
      quiz_mode: "concept_check" | "feynman"
      relation_type: "depends_on" | "derived_from" | "applied_in"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      block_type: ["text", "math", "code", "pdf_ref", "image_ref"],
      code_language: ["python", "r", "cpp", "matlab_pseudo"],
      concept_type: ["concept", "formula", "code", "experiment"],
      quiz_mode: ["concept_check", "feynman"],
      relation_type: ["depends_on", "derived_from", "applied_in"],
    },
  },
} as const
