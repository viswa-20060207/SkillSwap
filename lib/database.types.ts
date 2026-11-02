export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SkillCategory = 'technical' | 'soft_skill'
export type SkillRole = 'teach' | 'learn'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type SessionStatus = 'pending' | 'accepted' | 'declined'
export type NoteType = 'file' | 'snippet'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          bio: string
          avatar_url: string
          college: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          bio?: string
          avatar_url?: string
          college?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          bio?: string
          avatar_url?: string
          college?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      skills: {
        Row: {
          id: string
          name: string
          category: SkillCategory
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: SkillCategory
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: SkillCategory
          created_at?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          id: string
          user_id: string
          skill_id: string
          role: SkillRole
          level: SkillLevel
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          skill_id: string
          role: SkillRole
          level: SkillLevel
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          skill_id?: string
          role?: SkillRole
          level?: SkillLevel
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            referencedRelation: "skills"
            referencedColumns: ["id"]
          }
        ]
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      session_requests: {
        Row: {
          id: string
          from_id: string
          to_id: string
          skill_id: string | null
          message: string
          status: SessionStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          from_id: string
          to_id: string
          skill_id?: string | null
          message?: string
          status?: SessionStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          from_id?: string
          to_id?: string
          skill_id?: string | null
          message?: string
          status?: SessionStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_requests_from_id_fkey"
            columns: ["from_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_to_id_fkey"
            columns: ["to_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_skill_id_fkey"
            columns: ["skill_id"]
            referencedRelation: "skills"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          session_id: string
          sender_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          sender_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          sender_id?: string
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "session_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notes: {
        Row: {
          id: string
          session_id: string
          uploader_id: string
          type: NoteType
          title: string
          content: string
          file_path: string
          language: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          uploader_id: string
          type: NoteType
          title: string
          content?: string
          file_path?: string
          language?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          uploader_id?: string
          type?: NoteType
          title?: string
          content?: string
          file_path?: string
          language?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "session_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_uploader_id_fkey"
            columns: ["uploader_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          target_id: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_id: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          target_id?: string
          reason?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_id_fkey"
            columns: ["target_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
      skill_category: SkillCategory
      skill_role: SkillRole
      skill_level: SkillLevel
      session_status: SessionStatus
      note_type: NoteType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
