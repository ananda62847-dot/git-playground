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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_sticky_notes: {
        Row: {
          body: string
          color: string
          corruption_id: string | null
          created_at: string
          done: boolean
          due_at: string | null
          fund_request_id: string | null
          id: string
          is_task: boolean
          owner_user_id: string
          pinned: boolean
          problem_id: string | null
          shared: boolean
          title: string | null
          updated_at: string
          welfare_id: string | null
        }
        Insert: {
          body?: string
          color?: string
          corruption_id?: string | null
          created_at?: string
          done?: boolean
          due_at?: string | null
          fund_request_id?: string | null
          id?: string
          is_task?: boolean
          owner_user_id: string
          pinned?: boolean
          problem_id?: string | null
          shared?: boolean
          title?: string | null
          updated_at?: string
          welfare_id?: string | null
        }
        Update: {
          body?: string
          color?: string
          corruption_id?: string | null
          created_at?: string
          done?: boolean
          due_at?: string | null
          fund_request_id?: string | null
          id?: string
          is_task?: boolean
          owner_user_id?: string
          pinned?: boolean
          problem_id?: string | null
          shared?: boolean
          title?: string | null
          updated_at?: string
          welfare_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sticky_notes_corruption_id_fkey"
            columns: ["corruption_id"]
            isOneToOne: false
            referencedRelation: "corruption_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_sticky_notes_fund_request_id_fkey"
            columns: ["fund_request_id"]
            isOneToOne: false
            referencedRelation: "fund_assistance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_sticky_notes_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_sticky_notes_welfare_id_fkey"
            columns: ["welfare_id"]
            isOneToOne: false
            referencedRelation: "welfare_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_upcoming_tasks: {
        Row: {
          corruption_id: string | null
          created_at: string
          done: boolean
          due_at: string | null
          fund_request_id: string | null
          id: string
          notes: string | null
          owner_user_id: string
          problem_id: string | null
          title: string
          updated_at: string
          welfare_id: string | null
        }
        Insert: {
          corruption_id?: string | null
          created_at?: string
          done?: boolean
          due_at?: string | null
          fund_request_id?: string | null
          id?: string
          notes?: string | null
          owner_user_id: string
          problem_id?: string | null
          title: string
          updated_at?: string
          welfare_id?: string | null
        }
        Update: {
          corruption_id?: string | null
          created_at?: string
          done?: boolean
          due_at?: string | null
          fund_request_id?: string | null
          id?: string
          notes?: string | null
          owner_user_id?: string
          problem_id?: string | null
          title?: string
          updated_at?: string
          welfare_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_upcoming_tasks_corruption_id_fkey"
            columns: ["corruption_id"]
            isOneToOne: false
            referencedRelation: "corruption_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_upcoming_tasks_fund_request_id_fkey"
            columns: ["fund_request_id"]
            isOneToOne: false
            referencedRelation: "fund_assistance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_upcoming_tasks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_upcoming_tasks_welfare_id_fkey"
            columns: ["welfare_id"]
            isOneToOne: false
            referencedRelation: "welfare_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_policies: {
        Row: {
          agent_type: string
          confidence_threshold: number
          created_at: string
          daily_cap: number
          enabled: boolean
          id: string
          mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_type: string
          confidence_threshold?: number
          created_at?: string
          daily_cap?: number
          enabled?: boolean
          id?: string
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_type?: string
          confidence_threshold?: number
          created_at?: string
          daily_cap?: number
          enabled?: boolean
          id?: string
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      agent_weights: {
        Row: {
          agent_type: string
          cadre_id: string | null
          category: string | null
          id: string
          samples: number
          updated_at: string
          weight: number
        }
        Insert: {
          agent_type: string
          cadre_id?: string | null
          category?: string | null
          id?: string
          samples?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          agent_type?: string
          cadre_id?: string | null
          category?: string | null
          id?: string
          samples?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_weights_cadre_id_fkey"
            columns: ["cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_weights_cadre_id_fkey"
            columns: ["cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
        ]
      }
      ai_decisions: {
        Row: {
          acknowledged_at: string | null
          action: string
          agent_type: string
          alternatives: Json | null
          applied_at: string | null
          cadre_response: string | null
          confidence: number | null
          created_at: string
          delivered_channels: Json | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          override_reason: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score_breakdown: Json | null
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          action: string
          agent_type: string
          alternatives?: Json | null
          applied_at?: string | null
          cadre_response?: string | null
          confidence?: number | null
          created_at?: string
          delivered_channels?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          override_reason?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_breakdown?: Json | null
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          action?: string
          agent_type?: string
          alternatives?: Json | null
          applied_at?: string | null
          cadre_response?: string | null
          confidence?: number | null
          created_at?: string
          delivered_channels?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          override_reason?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_breakdown?: Json | null
          status?: string
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          agents_run: Json | null
          created_at: string
          decisions_created: number | null
          duration_ms: number | null
          error: string | null
          id: string
          outcomes: Json | null
          tasks_dispatched: number | null
          trigger: string
        }
        Insert: {
          agents_run?: Json | null
          created_at?: string
          decisions_created?: number | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          outcomes?: Json | null
          tasks_dispatched?: number | null
          trigger?: string
        }
        Update: {
          agents_run?: Json | null
          created_at?: string
          decisions_created?: number | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          outcomes?: Json | null
          tasks_dispatched?: number | null
          trigger?: string
        }
        Relationships: []
      }
      areas: {
        Row: {
          area_name: string
          city: string
          constituency: string
          created_at: string
          id: string
          polling_booths: string[] | null
        }
        Insert: {
          area_name: string
          city: string
          constituency: string
          created_at?: string
          id?: string
          polling_booths?: string[] | null
        }
        Update: {
          area_name?: string
          city?: string
          constituency?: string
          created_at?: string
          id?: string
          polling_booths?: string[] | null
        }
        Relationships: []
      }
      blueprint_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["blueprint_audit_action"]
          actor_cadre_id: string | null
          actor_label: string | null
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          blueprint_id: string
          corruption_id: string | null
          created_at: string
          id: string
          problem_id: string | null
          reason: string | null
          task_id: string | null
          welfare_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["blueprint_audit_action"]
          actor_cadre_id?: string | null
          actor_label?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          blueprint_id: string
          corruption_id?: string | null
          created_at?: string
          id?: string
          problem_id?: string | null
          reason?: string | null
          task_id?: string | null
          welfare_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["blueprint_audit_action"]
          actor_cadre_id?: string | null
          actor_label?: string | null
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          blueprint_id?: string
          corruption_id?: string | null
          created_at?: string
          id?: string
          problem_id?: string | null
          reason?: string | null
          task_id?: string | null
          welfare_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_audit_log_actor_cadre_id_fkey"
            columns: ["actor_cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_audit_log_actor_cadre_id_fkey"
            columns: ["actor_cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
          {
            foreignKeyName: "blueprint_audit_log_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "resolution_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_audit_log_corruption_id_fkey"
            columns: ["corruption_id"]
            isOneToOne: false
            referencedRelation: "corruption_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_audit_log_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_audit_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "blueprint_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_audit_log_welfare_id_fkey"
            columns: ["welfare_id"]
            isOneToOne: false
            referencedRelation: "welfare_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprint_tasks: {
        Row: {
          blueprint_id: string
          completed_at: string | null
          completed_by_cadre_id: string | null
          contact_point: string | null
          contact_point_ta: string | null
          corruption_id: string | null
          created_at: string
          criteria_checked: Json
          depends_on: string[]
          due_at: string | null
          due_in_hours: number | null
          evidence_files: Json
          evidence_required: string[]
          evidence_required_ta: string[] | null
          id: string
          notes: string | null
          objective: string | null
          objective_ta: string | null
          owner_cadre_id: string | null
          owner_role: string | null
          owner_team_id: string | null
          priority: Database["public"]["Enums"]["blueprint_task_priority"]
          problem_id: string | null
          proof_urls: string[]
          seq: number
          started_at: string | null
          status: Database["public"]["Enums"]["blueprint_task_status"]
          success_criteria: string[]
          success_criteria_ta: string[] | null
          title: string
          title_ta: string | null
          updated_at: string
          welfare_id: string | null
        }
        Insert: {
          blueprint_id: string
          completed_at?: string | null
          completed_by_cadre_id?: string | null
          contact_point?: string | null
          contact_point_ta?: string | null
          corruption_id?: string | null
          created_at?: string
          criteria_checked?: Json
          depends_on?: string[]
          due_at?: string | null
          due_in_hours?: number | null
          evidence_files?: Json
          evidence_required?: string[]
          evidence_required_ta?: string[] | null
          id?: string
          notes?: string | null
          objective?: string | null
          objective_ta?: string | null
          owner_cadre_id?: string | null
          owner_role?: string | null
          owner_team_id?: string | null
          priority?: Database["public"]["Enums"]["blueprint_task_priority"]
          problem_id?: string | null
          proof_urls?: string[]
          seq: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["blueprint_task_status"]
          success_criteria?: string[]
          success_criteria_ta?: string[] | null
          title: string
          title_ta?: string | null
          updated_at?: string
          welfare_id?: string | null
        }
        Update: {
          blueprint_id?: string
          completed_at?: string | null
          completed_by_cadre_id?: string | null
          contact_point?: string | null
          contact_point_ta?: string | null
          corruption_id?: string | null
          created_at?: string
          criteria_checked?: Json
          depends_on?: string[]
          due_at?: string | null
          due_in_hours?: number | null
          evidence_files?: Json
          evidence_required?: string[]
          evidence_required_ta?: string[] | null
          id?: string
          notes?: string | null
          objective?: string | null
          objective_ta?: string | null
          owner_cadre_id?: string | null
          owner_role?: string | null
          owner_team_id?: string | null
          priority?: Database["public"]["Enums"]["blueprint_task_priority"]
          problem_id?: string | null
          proof_urls?: string[]
          seq?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["blueprint_task_status"]
          success_criteria?: string[]
          success_criteria_ta?: string[] | null
          title?: string
          title_ta?: string | null
          updated_at?: string
          welfare_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_tasks_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "resolution_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_tasks_completed_by_cadre_id_fkey"
            columns: ["completed_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_tasks_completed_by_cadre_id_fkey"
            columns: ["completed_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
          {
            foreignKeyName: "blueprint_tasks_corruption_id_fkey"
            columns: ["corruption_id"]
            isOneToOne: false
            referencedRelation: "corruption_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_tasks_owner_cadre_id_fkey"
            columns: ["owner_cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_tasks_owner_cadre_id_fkey"
            columns: ["owner_cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
          {
            foreignKeyName: "blueprint_tasks_owner_team_id_fkey"
            columns: ["owner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_tasks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_tasks_welfare_id_fkey"
            columns: ["welfare_id"]
            isOneToOne: false
            referencedRelation: "welfare_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      cadre_ai_tasks: {
        Row: {
          acknowledged_at: string | null
          action: string
          ai_message: string
          cadre_id: string
          cadre_response: string | null
          completed_at: string | null
          created_at: string
          decision_id: string | null
          delivered_channels: Json | null
          due_at: string | null
          id: string
          metadata: Json | null
          priority: string
          problem_id: string | null
          reply_attachments: Json
          reply_text: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          action: string
          ai_message: string
          cadre_id: string
          cadre_response?: string | null
          completed_at?: string | null
          created_at?: string
          decision_id?: string | null
          delivered_channels?: Json | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          problem_id?: string | null
          reply_attachments?: Json
          reply_text?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          action?: string
          ai_message?: string
          cadre_id?: string
          cadre_response?: string | null
          completed_at?: string | null
          created_at?: string
          decision_id?: string | null
          delivered_channels?: Json | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          problem_id?: string | null
          reply_attachments?: Json
          reply_text?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadre_ai_tasks_cadre_id_fkey"
            columns: ["cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadre_ai_tasks_cadre_id_fkey"
            columns: ["cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
          {
            foreignKeyName: "cadre_ai_tasks_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "ai_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadre_ai_tasks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      cadres: {
        Row: {
          active: boolean
          approved: boolean
          area: string | null
          city: string
          constituency: string | null
          created_at: string
          email: string | null
          id: string
          joined_at: string
          last_seen_at: string | null
          level: string
          name: string
          notes: string | null
          phone: string
          points: number
          profile_photo_url: string | null
          public_role_label: string | null
          public_visible: boolean
          rank_tier: string
          resolved_count: number
          role_title: string | null
          show_phone: boolean
          skills: string[] | null
          source: string | null
          stars: number
          updated_at: string
          user_id: string | null
          ward_number: string | null
        }
        Insert: {
          active?: boolean
          approved?: boolean
          area?: string | null
          city: string
          constituency?: string | null
          created_at?: string
          email?: string | null
          id?: string
          joined_at?: string
          last_seen_at?: string | null
          level?: string
          name: string
          notes?: string | null
          phone: string
          points?: number
          profile_photo_url?: string | null
          public_role_label?: string | null
          public_visible?: boolean
          rank_tier?: string
          resolved_count?: number
          role_title?: string | null
          show_phone?: boolean
          skills?: string[] | null
          source?: string | null
          stars?: number
          updated_at?: string
          user_id?: string | null
          ward_number?: string | null
        }
        Update: {
          active?: boolean
          approved?: boolean
          area?: string | null
          city?: string
          constituency?: string | null
          created_at?: string
          email?: string | null
          id?: string
          joined_at?: string
          last_seen_at?: string | null
          level?: string
          name?: string
          notes?: string | null
          phone?: string
          points?: number
          profile_photo_url?: string | null
          public_role_label?: string | null
          public_visible?: boolean
          rank_tier?: string
          resolved_count?: number
          role_title?: string | null
          show_phone?: boolean
          skills?: string[] | null
          source?: string | null
          stars?: number
          updated_at?: string
          user_id?: string | null
          ward_number?: string | null
        }
        Relationships: []
      }
      completed_works: {
        Row: {
          after_image_url: string | null
          area: string | null
          before_image_url: string | null
          beneficiaries: number | null
          category: string | null
          city: string | null
          completed_on: string | null
          constituency: string | null
          cost_amount: number | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          gallery_urls: string[] | null
          highlight: boolean | null
          id: string
          published: boolean | null
          reviews: Json | null
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          after_image_url?: string | null
          area?: string | null
          before_image_url?: string | null
          beneficiaries?: number | null
          category?: string | null
          city?: string | null
          completed_on?: string | null
          constituency?: string | null
          cost_amount?: number | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          gallery_urls?: string[] | null
          highlight?: boolean | null
          id?: string
          published?: boolean | null
          reviews?: Json | null
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          after_image_url?: string | null
          area?: string | null
          before_image_url?: string | null
          beneficiaries?: number | null
          category?: string | null
          city?: string | null
          completed_on?: string | null
          constituency?: string | null
          cost_amount?: number | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          gallery_urls?: string[] | null
          highlight?: boolean | null
          id?: string
          published?: boolean | null
          reviews?: Json | null
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      corruption_assignments: {
        Row: {
          active: boolean
          assigned_by: string | null
          cadre_id: string | null
          claimed_at: string | null
          claimed_by_cadre_id: string | null
          corruption_id: string
          created_at: string
          estimated_completion_at: string | null
          id: string
          notes: string | null
          team_id: string | null
        }
        Insert: {
          active?: boolean
          assigned_by?: string | null
          cadre_id?: string | null
          claimed_at?: string | null
          claimed_by_cadre_id?: string | null
          corruption_id: string
          created_at?: string
          estimated_completion_at?: string | null
          id?: string
          notes?: string | null
          team_id?: string | null
        }
        Update: {
          active?: boolean
          assigned_by?: string | null
          cadre_id?: string | null
          claimed_at?: string | null
          claimed_by_cadre_id?: string | null
          corruption_id?: string
          created_at?: string
          estimated_completion_at?: string | null
          id?: string
          notes?: string | null
          team_id?: string | null
        }
        Relationships: []
      }
      corruption_internal_notes: {
        Row: {
          author_label: string | null
          author_user_id: string | null
          corruption_id: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          author_label?: string | null
          author_user_id?: string | null
          corruption_id: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          author_label?: string | null
          author_user_id?: string | null
          corruption_id?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "corruption_internal_notes_corruption_id_fkey"
            columns: ["corruption_id"]
            isOneToOne: false
            referencedRelation: "corruption_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      corruption_reports: {
        Row: {
          ai_action_plan: string | null
          ai_action_plan_at: string | null
          amount_demanded: number | null
          area: string | null
          belongs_to_constituency: boolean
          city: string | null
          closed_as_false: boolean
          closed_as_false_at: string | null
          closed_as_false_by: string | null
          closed_as_false_reason: string | null
          confirmed_good_faith: boolean
          constituency: string | null
          created_at: string
          department: string | null
          description: string
          evidence_url: string | null
          evidence_urls: string[] | null
          id: string
          incident_date: string | null
          incident_time: string | null
          incident_type: string | null
          is_cadre_filed: boolean
          office_location: string | null
          person_involved: string | null
          person_name: string | null
          reported_by_cadre_id: string | null
          status: string
          ticket_no: string
        }
        Insert: {
          ai_action_plan?: string | null
          ai_action_plan_at?: string | null
          amount_demanded?: number | null
          area?: string | null
          belongs_to_constituency?: boolean
          city?: string | null
          closed_as_false?: boolean
          closed_as_false_at?: string | null
          closed_as_false_by?: string | null
          closed_as_false_reason?: string | null
          confirmed_good_faith?: boolean
          constituency?: string | null
          created_at?: string
          department?: string | null
          description: string
          evidence_url?: string | null
          evidence_urls?: string[] | null
          id?: string
          incident_date?: string | null
          incident_time?: string | null
          incident_type?: string | null
          is_cadre_filed?: boolean
          office_location?: string | null
          person_involved?: string | null
          person_name?: string | null
          reported_by_cadre_id?: string | null
          status?: string
          ticket_no?: string
        }
        Update: {
          ai_action_plan?: string | null
          ai_action_plan_at?: string | null
          amount_demanded?: number | null
          area?: string | null
          belongs_to_constituency?: boolean
          city?: string | null
          closed_as_false?: boolean
          closed_as_false_at?: string | null
          closed_as_false_by?: string | null
          closed_as_false_reason?: string | null
          confirmed_good_faith?: boolean
          constituency?: string | null
          created_at?: string
          department?: string | null
          description?: string
          evidence_url?: string | null
          evidence_urls?: string[] | null
          id?: string
          incident_date?: string | null
          incident_time?: string | null
          incident_type?: string | null
          is_cadre_filed?: boolean
          office_location?: string | null
          person_involved?: string | null
          person_name?: string | null
          reported_by_cadre_id?: string | null
          status?: string
          ticket_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "corruption_reports_reported_by_cadre_id_fkey"
            columns: ["reported_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corruption_reports_reported_by_cadre_id_fkey"
            columns: ["reported_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
        ]
      }
      department_officers: {
        Row: {
          created_at: string
          department: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          attempts: number
          body_html: string
          body_text: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          last_error: string | null
          problem_id: string | null
          recipient_email: string
          recipient_role: string | null
          sent_at: string | null
          status: string
          subject: string
          trigger_code: string
        }
        Insert: {
          attempts?: number
          body_html: string
          body_text?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          problem_id?: string | null
          recipient_email: string
          recipient_role?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          trigger_code: string
        }
        Update: {
          attempts?: number
          body_html?: string
          body_text?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          problem_id?: string | null
          recipient_email?: string
          recipient_role?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          trigger_code?: string
        }
        Relationships: []
      }
      escalations: {
        Row: {
          auto_escalated: boolean
          checklist: Json
          created_at: string
          escalated_to_level: string | null
          id: string
          problem_id: string
          raised_by: string | null
          raised_by_cadre_id: string | null
          reason: string
          resolved_at: string | null
          seen_by: Json
          status: string
          status_history: Json
          to_level: string
        }
        Insert: {
          auto_escalated?: boolean
          checklist?: Json
          created_at?: string
          escalated_to_level?: string | null
          id?: string
          problem_id: string
          raised_by?: string | null
          raised_by_cadre_id?: string | null
          reason: string
          resolved_at?: string | null
          seen_by?: Json
          status?: string
          status_history?: Json
          to_level?: string
        }
        Update: {
          auto_escalated?: boolean
          checklist?: Json
          created_at?: string
          escalated_to_level?: string | null
          id?: string
          problem_id?: string
          raised_by?: string | null
          raised_by_cadre_id?: string | null
          reason?: string
          resolved_at?: string | null
          seen_by?: Json
          status?: string
          status_history?: Json
          to_level?: string
        }
        Relationships: []
      }
      evidence_scores: {
        Row: {
          authenticity: number | null
          clarity: number | null
          context: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          file_url: string
          id: string
          model: string | null
          overall_score: number | null
          relevance: number | null
          remarks: string | null
          run_reason: string
          triggered_by_user_id: string | null
          uploaded_by_cadre_id: string | null
        }
        Insert: {
          authenticity?: number | null
          clarity?: number | null
          context?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          file_url: string
          id?: string
          model?: string | null
          overall_score?: number | null
          relevance?: number | null
          remarks?: string | null
          run_reason?: string
          triggered_by_user_id?: string | null
          uploaded_by_cadre_id?: string | null
        }
        Update: {
          authenticity?: number | null
          clarity?: number | null
          context?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          file_url?: string
          id?: string
          model?: string | null
          overall_score?: number | null
          relevance?: number | null
          remarks?: string | null
          run_reason?: string
          triggered_by_user_id?: string | null
          uploaded_by_cadre_id?: string | null
        }
        Relationships: []
      }
      fund_assistance_requests: {
        Row: {
          admin_notes: string | null
          amount_requested: number | null
          bank_details: string | null
          belongs_to_constituency: boolean
          beneficiary_address: string | null
          beneficiary_age: number | null
          beneficiary_name: string
          beneficiary_phone: string
          category: string
          city: string | null
          closed_as_false: boolean
          closed_as_false_at: string | null
          closed_as_false_by: string | null
          closed_as_false_reason: string | null
          constituency: string | null
          created_at: string
          disbursed_amount: number | null
          disbursed_at: string | null
          disclaimer_accepted: boolean
          filed_by_cadre_id: string | null
          id: string
          is_cadre_filed: boolean
          latitude: number | null
          longitude: number | null
          purpose: string
          reviewed_by: string | null
          status: string
          supporting_docs: string[]
          ticket_no: string
          updated_at: string
          urgency: string
          voice_note_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_requested?: number | null
          bank_details?: string | null
          belongs_to_constituency?: boolean
          beneficiary_address?: string | null
          beneficiary_age?: number | null
          beneficiary_name: string
          beneficiary_phone: string
          category: string
          city?: string | null
          closed_as_false?: boolean
          closed_as_false_at?: string | null
          closed_as_false_by?: string | null
          closed_as_false_reason?: string | null
          constituency?: string | null
          created_at?: string
          disbursed_amount?: number | null
          disbursed_at?: string | null
          disclaimer_accepted?: boolean
          filed_by_cadre_id?: string | null
          id?: string
          is_cadre_filed?: boolean
          latitude?: number | null
          longitude?: number | null
          purpose: string
          reviewed_by?: string | null
          status?: string
          supporting_docs?: string[]
          ticket_no?: string
          updated_at?: string
          urgency?: string
          voice_note_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_requested?: number | null
          bank_details?: string | null
          belongs_to_constituency?: boolean
          beneficiary_address?: string | null
          beneficiary_age?: number | null
          beneficiary_name?: string
          beneficiary_phone?: string
          category?: string
          city?: string | null
          closed_as_false?: boolean
          closed_as_false_at?: string | null
          closed_as_false_by?: string | null
          closed_as_false_reason?: string | null
          constituency?: string | null
          created_at?: string
          disbursed_amount?: number | null
          disbursed_at?: string | null
          disclaimer_accepted?: boolean
          filed_by_cadre_id?: string | null
          id?: string
          is_cadre_filed?: boolean
          latitude?: number | null
          longitude?: number | null
          purpose?: string
          reviewed_by?: string | null
          status?: string
          supporting_docs?: string[]
          ticket_no?: string
          updated_at?: string
          urgency?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fund_assistance_requests_filed_by_cadre_id_fkey"
            columns: ["filed_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_assistance_requests_filed_by_cadre_id_fkey"
            columns: ["filed_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
        ]
      }
      gamification_events: {
        Row: {
          cadre_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          points_awarded: number
          problem_id: string | null
          stars_awarded: number
          team_id: string | null
        }
        Insert: {
          cadre_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          points_awarded?: number
          problem_id?: string | null
          stars_awarded?: number
          team_id?: string | null
        }
        Update: {
          cadre_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          points_awarded?: number
          problem_id?: string | null
          stars_awarded?: number
          team_id?: string | null
        }
        Relationships: []
      }
      grievances: {
        Row: {
          age: number
          area: string | null
          categories: string[] | null
          city: string
          constituency: string | null
          created_at: string
          grievance: string
          id: string
          name: string
          occupation: string
          pincode: string
          polling_booth: string | null
          sentiment: string | null
          sentiment_score: number | null
          status: string | null
          sub_categories: string[] | null
          updated_at: string
        }
        Insert: {
          age: number
          area?: string | null
          categories?: string[] | null
          city: string
          constituency?: string | null
          created_at?: string
          grievance: string
          id?: string
          name: string
          occupation: string
          pincode: string
          polling_booth?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          status?: string | null
          sub_categories?: string[] | null
          updated_at?: string
        }
        Update: {
          age?: number
          area?: string | null
          categories?: string[] | null
          city?: string
          constituency?: string | null
          created_at?: string
          grievance?: string
          id?: string
          name?: string
          occupation?: string
          pincode?: string
          polling_booth?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          status?: string | null
          sub_categories?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      moderator_constituencies: {
        Row: {
          constituency: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          constituency: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          constituency?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_tokens: {
        Row: {
          constituency: string | null
          created_at: string
          department: string | null
          fcm_token: string
          id: string
          role: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          constituency?: string | null
          created_at?: string
          department?: string | null
          fcm_token: string
          id?: string
          role: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          constituency?: string | null
          created_at?: string
          department?: string | null
          fcm_token?: string
          id?: string
          role?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          constituency: string | null
          created_at: string
          data: Json | null
          department: string | null
          id: string
          read: boolean
          role: string | null
          severity: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          constituency?: string | null
          created_at?: string
          data?: Json | null
          department?: string | null
          id?: string
          read?: boolean
          role?: string | null
          severity?: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          constituency?: string | null
          created_at?: string
          data?: Json | null
          department?: string | null
          id?: string
          read?: boolean
          role?: string | null
          severity?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      problem_assignment_joiners: {
        Row: {
          assignment_id: string
          cadre_id: string
          id: string
          joined_at: string
        }
        Insert: {
          assignment_id: string
          cadre_id: string
          id?: string
          joined_at?: string
        }
        Update: {
          assignment_id?: string
          cadre_id?: string
          id?: string
          joined_at?: string
        }
        Relationships: []
      }
      problem_assignments: {
        Row: {
          active: boolean
          assigned_by: string | null
          cadre_id: string | null
          claimed_at: string | null
          claimed_by_cadre_id: string | null
          created_at: string
          escalated_at: string | null
          estimated_completion_at: string | null
          id: string
          notes: string | null
          problem_id: string
          team_id: string | null
        }
        Insert: {
          active?: boolean
          assigned_by?: string | null
          cadre_id?: string | null
          claimed_at?: string | null
          claimed_by_cadre_id?: string | null
          created_at?: string
          escalated_at?: string | null
          estimated_completion_at?: string | null
          id?: string
          notes?: string | null
          problem_id: string
          team_id?: string | null
        }
        Update: {
          active?: boolean
          assigned_by?: string | null
          cadre_id?: string | null
          claimed_at?: string | null
          claimed_by_cadre_id?: string | null
          created_at?: string
          escalated_at?: string | null
          estimated_completion_at?: string | null
          id?: string
          notes?: string | null
          problem_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_assignments_cadre_id_fkey"
            columns: ["cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_assignments_cadre_id_fkey"
            columns: ["cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
          {
            foreignKeyName: "problem_assignments_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_media: {
        Row: {
          created_at: string
          id: string
          is_after_proof: boolean | null
          media_type: string
          problem_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_after_proof?: boolean | null
          media_type?: string
          problem_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_after_proof?: boolean | null
          media_type?: string
          problem_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_media_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_supporters: {
        Row: {
          created_at: string
          id: string
          problem_id: string
          supporter_name: string | null
          supporter_phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          problem_id: string
          supporter_name?: string | null
          supporter_phone: string
        }
        Update: {
          created_at?: string
          id?: string
          problem_id?: string
          supporter_name?: string | null
          supporter_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_supporters_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_updates: {
        Row: {
          after_url: string | null
          before_url: string | null
          created_at: string
          id: string
          note: string | null
          problem_id: string
          proof_url: string | null
          status: string
          updated_by: string | null
        }
        Insert: {
          after_url?: string | null
          before_url?: string | null
          created_at?: string
          id?: string
          note?: string | null
          problem_id: string
          proof_url?: string | null
          status: string
          updated_by?: string | null
        }
        Update: {
          after_url?: string | null
          before_url?: string | null
          created_at?: string
          id?: string
          note?: string | null
          problem_id?: string
          proof_url?: string | null
          status?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_updates_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          address_line: string | null
          ai_action_plan: string | null
          ai_action_plan_at: string | null
          area: string | null
          assigned_to: string | null
          belongs_to_constituency: boolean
          category: string
          citizen_confirmed: boolean | null
          city: string
          closed_as_false: boolean
          closed_as_false_at: string | null
          closed_as_false_by: string | null
          closed_as_false_reason: string | null
          completion_report_url: string | null
          constituency: string | null
          created_at: string
          department: string
          description: string
          id: string
          is_cadre_filed: boolean
          latitude: number | null
          longitude: number | null
          master_problem_id: string | null
          pincode: string
          polling_booth: string | null
          reported_by_cadre_id: string | null
          reporter_age: number | null
          reporter_name: string
          reporter_phone: string
          resolved_at: string | null
          satisfaction_rating: number | null
          sentiment: string | null
          severity: string | null
          status: string
          support_count: number
          ticket_no: string
          title: string
          updated_at: string
          urgency: string
          voice_note_url: string | null
          voice_transcript: string | null
        }
        Insert: {
          address_line?: string | null
          ai_action_plan?: string | null
          ai_action_plan_at?: string | null
          area?: string | null
          assigned_to?: string | null
          belongs_to_constituency?: boolean
          category: string
          citizen_confirmed?: boolean | null
          city: string
          closed_as_false?: boolean
          closed_as_false_at?: string | null
          closed_as_false_by?: string | null
          closed_as_false_reason?: string | null
          completion_report_url?: string | null
          constituency?: string | null
          created_at?: string
          department: string
          description: string
          id?: string
          is_cadre_filed?: boolean
          latitude?: number | null
          longitude?: number | null
          master_problem_id?: string | null
          pincode: string
          polling_booth?: string | null
          reported_by_cadre_id?: string | null
          reporter_age?: number | null
          reporter_name: string
          reporter_phone: string
          resolved_at?: string | null
          satisfaction_rating?: number | null
          sentiment?: string | null
          severity?: string | null
          status?: string
          support_count?: number
          ticket_no?: string
          title: string
          updated_at?: string
          urgency?: string
          voice_note_url?: string | null
          voice_transcript?: string | null
        }
        Update: {
          address_line?: string | null
          ai_action_plan?: string | null
          ai_action_plan_at?: string | null
          area?: string | null
          assigned_to?: string | null
          belongs_to_constituency?: boolean
          category?: string
          citizen_confirmed?: boolean | null
          city?: string
          closed_as_false?: boolean
          closed_as_false_at?: string | null
          closed_as_false_by?: string | null
          closed_as_false_reason?: string | null
          completion_report_url?: string | null
          constituency?: string | null
          created_at?: string
          department?: string
          description?: string
          id?: string
          is_cadre_filed?: boolean
          latitude?: number | null
          longitude?: number | null
          master_problem_id?: string | null
          pincode?: string
          polling_booth?: string | null
          reported_by_cadre_id?: string | null
          reporter_age?: number | null
          reporter_name?: string
          reporter_phone?: string
          resolved_at?: string | null
          satisfaction_rating?: number | null
          sentiment?: string | null
          severity?: string | null
          status?: string
          support_count?: number
          ticket_no?: string
          title?: string
          updated_at?: string
          urgency?: string
          voice_note_url?: string | null
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problems_master_problem_id_fkey"
            columns: ["master_problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problems_reported_by_cadre_id_fkey"
            columns: ["reported_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problems_reported_by_cadre_id_fkey"
            columns: ["reported_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resolution_blueprints: {
        Row: {
          area_type: string | null
          case_summary: string | null
          case_summary_ta: string | null
          corruption_id: string | null
          created_at: string
          estimated_days: number | null
          generated_by: string
          id: string
          is_active: boolean
          model: string | null
          problem_id: string | null
          responsible_department: string | null
          title: string | null
          title_ta: string | null
          updated_at: string
          version: number
          welfare_id: string | null
        }
        Insert: {
          area_type?: string | null
          case_summary?: string | null
          case_summary_ta?: string | null
          corruption_id?: string | null
          created_at?: string
          estimated_days?: number | null
          generated_by?: string
          id?: string
          is_active?: boolean
          model?: string | null
          problem_id?: string | null
          responsible_department?: string | null
          title?: string | null
          title_ta?: string | null
          updated_at?: string
          version?: number
          welfare_id?: string | null
        }
        Update: {
          area_type?: string | null
          case_summary?: string | null
          case_summary_ta?: string | null
          corruption_id?: string | null
          created_at?: string
          estimated_days?: number | null
          generated_by?: string
          id?: string
          is_active?: boolean
          model?: string | null
          problem_id?: string | null
          responsible_department?: string | null
          title?: string | null
          title_ta?: string | null
          updated_at?: string
          version?: number
          welfare_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resolution_blueprints_corruption_id_fkey"
            columns: ["corruption_id"]
            isOneToOne: false
            referencedRelation: "corruption_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_blueprints_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_blueprints_welfare_id_fkey"
            columns: ["welfare_id"]
            isOneToOne: false
            referencedRelation: "welfare_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_surveys: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          problem_id: string
          rating: number
          resolution_quality: number | null
          speed: number | null
          staff_behavior: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          problem_id: string
          rating: number
          resolution_quality?: number | null
          speed?: number | null
          staff_behavior?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          problem_id?: string
          rating?: number
          resolution_quality?: number | null
          speed?: number | null
          staff_behavior?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_surveys_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_targets: {
        Row: {
          category: string | null
          created_at: string
          department: string
          hours_to_acknowledge: number
          hours_to_resolve: number
          id: string
          urgency: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          department: string
          hours_to_acknowledge?: number
          hours_to_resolve?: number
          id?: string
          urgency?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          department?: string
          hours_to_acknowledge?: number
          hours_to_resolve?: number
          id?: string
          urgency?: string
        }
        Relationships: []
      }
      sms_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          idempotency_key: string | null
          message: string
          problem_id: string | null
          provider_sid: string | null
          recipient_phone: string
          sent_at: string | null
          status: string
          trigger_code: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          message: string
          problem_id?: string | null
          provider_sid?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: string
          trigger_code: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          message?: string
          problem_id?: string | null
          provider_sid?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: string
          trigger_code?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          category: string | null
          city: string | null
          constituency: string | null
          created_at: string
          id: string
          image_url: string | null
          pinned: boolean | null
          title: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          category?: string | null
          city?: string | null
          constituency?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean | null
          title?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          category?: string | null
          city?: string | null
          constituency?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean | null
          title?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          added_at: string
          cadre_id: string
          id: string
          role_in_team: string | null
          team_id: string
        }
        Insert: {
          added_at?: string
          cadre_id: string
          id?: string
          role_in_team?: string | null
          team_id: string
        }
        Update: {
          added_at?: string
          cadre_id?: string
          id?: string
          role_in_team?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_cadre_id_fkey"
            columns: ["cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_cadre_id_fkey"
            columns: ["cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_postings: {
        Row: {
          area: string | null
          cadre_id: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          notes: string | null
          posting_title: string
          posting_type: string
          starts_at: string
          team_id: string
        }
        Insert: {
          area?: string | null
          cadre_id: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          notes?: string | null
          posting_title: string
          posting_type?: string
          starts_at?: string
          team_id: string
        }
        Update: {
          area?: string | null
          cadre_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          notes?: string | null
          posting_title?: string
          posting_type?: string
          starts_at?: string
          team_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          active: boolean
          city: string | null
          constituency: string | null
          created_at: string
          department: string | null
          description: string | null
          id: string
          lead_cadre_id: string | null
          name: string
          points: number
          resolved_count: number
          stars: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          constituency?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          lead_cadre_id?: string | null
          name: string
          points?: number
          resolved_count?: number
          stars?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          constituency?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          lead_cadre_id?: string | null
          name?: string
          points?: number
          resolved_count?: number
          stars?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_lead_cadre_id_fkey"
            columns: ["lead_cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_lead_cadre_id_fkey"
            columns: ["lead_cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
        ]
      }
      translations_cache: {
        Row: {
          created_at: string
          source_hash: string
          target_lang: string
          translated: string
        }
        Insert: {
          created_at?: string
          source_hash: string
          target_lang: string
          translated: string
        }
        Update: {
          created_at?: string
          source_hash?: string
          target_lang?: string
          translated?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteers: {
        Row: {
          area: string | null
          availability: string | null
          city: string
          constituency: string | null
          created_at: string
          id: string
          interests: string[] | null
          name: string
          phone: string
          polling_booth: string | null
          submission_id: string | null
          submission_type: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          availability?: string | null
          city: string
          constituency?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          name: string
          phone: string
          polling_booth?: string | null
          submission_id?: string | null
          submission_type?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          availability?: string | null
          city?: string
          constituency?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          name?: string
          phone?: string
          polling_booth?: string | null
          submission_id?: string | null
          submission_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      welfare_assignments: {
        Row: {
          active: boolean
          assigned_by: string | null
          cadre_id: string | null
          claimed_at: string | null
          claimed_by_cadre_id: string | null
          created_at: string
          estimated_completion_at: string | null
          id: string
          notes: string | null
          team_id: string | null
          welfare_id: string
        }
        Insert: {
          active?: boolean
          assigned_by?: string | null
          cadre_id?: string | null
          claimed_at?: string | null
          claimed_by_cadre_id?: string | null
          created_at?: string
          estimated_completion_at?: string | null
          id?: string
          notes?: string | null
          team_id?: string | null
          welfare_id: string
        }
        Update: {
          active?: boolean
          assigned_by?: string | null
          cadre_id?: string | null
          claimed_at?: string | null
          claimed_by_cadre_id?: string | null
          created_at?: string
          estimated_completion_at?: string | null
          id?: string
          notes?: string | null
          team_id?: string | null
          welfare_id?: string
        }
        Relationships: []
      }
      welfare_issues: {
        Row: {
          address_line: string | null
          ai_action_plan: string | null
          ai_action_plan_at: string | null
          application_id: string | null
          area: string | null
          belongs_to_constituency: boolean
          citizen_confirmed: boolean | null
          city: string
          closed_as_false: boolean
          closed_as_false_at: string | null
          closed_as_false_by: string | null
          closed_as_false_reason: string | null
          constituency: string | null
          created_at: string
          department: string | null
          description: string
          id: string
          is_cadre_filed: boolean
          latitude: number | null
          longitude: number | null
          months_pending: string | null
          pincode: string
          proof_urls: string[] | null
          reported_by_cadre_id: string | null
          reporter_age: number | null
          reporter_name: string
          reporter_phone: string
          resolved_at: string | null
          satisfaction_rating: number | null
          scheme_name: string | null
          scheme_type: string
          status: string
          subcategory: string
          ticket_no: string
          title: string
          updated_at: string
          urgency: string
          voice_note_url: string | null
          voice_transcript: string | null
        }
        Insert: {
          address_line?: string | null
          ai_action_plan?: string | null
          ai_action_plan_at?: string | null
          application_id?: string | null
          area?: string | null
          belongs_to_constituency?: boolean
          citizen_confirmed?: boolean | null
          city: string
          closed_as_false?: boolean
          closed_as_false_at?: string | null
          closed_as_false_by?: string | null
          closed_as_false_reason?: string | null
          constituency?: string | null
          created_at?: string
          department?: string | null
          description: string
          id?: string
          is_cadre_filed?: boolean
          latitude?: number | null
          longitude?: number | null
          months_pending?: string | null
          pincode: string
          proof_urls?: string[] | null
          reported_by_cadre_id?: string | null
          reporter_age?: number | null
          reporter_name: string
          reporter_phone: string
          resolved_at?: string | null
          satisfaction_rating?: number | null
          scheme_name?: string | null
          scheme_type: string
          status?: string
          subcategory: string
          ticket_no?: string
          title: string
          updated_at?: string
          urgency?: string
          voice_note_url?: string | null
          voice_transcript?: string | null
        }
        Update: {
          address_line?: string | null
          ai_action_plan?: string | null
          ai_action_plan_at?: string | null
          application_id?: string | null
          area?: string | null
          belongs_to_constituency?: boolean
          citizen_confirmed?: boolean | null
          city?: string
          closed_as_false?: boolean
          closed_as_false_at?: string | null
          closed_as_false_by?: string | null
          closed_as_false_reason?: string | null
          constituency?: string | null
          created_at?: string
          department?: string | null
          description?: string
          id?: string
          is_cadre_filed?: boolean
          latitude?: number | null
          longitude?: number | null
          months_pending?: string | null
          pincode?: string
          proof_urls?: string[] | null
          reported_by_cadre_id?: string | null
          reporter_age?: number | null
          reporter_name?: string
          reporter_phone?: string
          resolved_at?: string | null
          satisfaction_rating?: number | null
          scheme_name?: string | null
          scheme_type?: string
          status?: string
          subcategory?: string
          ticket_no?: string
          title?: string
          updated_at?: string
          urgency?: string
          voice_note_url?: string | null
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "welfare_issues_reported_by_cadre_id_fkey"
            columns: ["reported_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "cadres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welfare_issues_reported_by_cadre_id_fkey"
            columns: ["reported_by_cadre_id"]
            isOneToOne: false
            referencedRelation: "mv_cadre_workload"
            referencedColumns: ["cadre_id"]
          },
        ]
      }
      welfare_updates: {
        Row: {
          created_at: string
          id: string
          note: string | null
          proof_url: string | null
          status: string
          updated_by: string | null
          welfare_issue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          proof_url?: string | null
          status: string
          updated_by?: string | null
          welfare_issue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          proof_url?: string | null
          status?: string
          updated_by?: string | null
          welfare_issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "welfare_updates_welfare_issue_id_fkey"
            columns: ["welfare_issue_id"]
            isOneToOne: false
            referencedRelation: "welfare_issues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_cadre_workload: {
        Row: {
          cadre_id: string | null
          constituency: string | null
          last_assigned_at: string | null
          open_ai_tasks: number | null
          pending_assignments: number | null
        }
        Relationships: []
      }
      mv_city_problem_counts: {
        Row: {
          city: string | null
          pending: number | null
          resolved: number | null
          total: number | null
        }
        Relationships: []
      }
      mv_constituency_problem_counts: {
        Row: {
          constituency: string | null
          pending: number | null
          resolved: number | null
          total: number | null
        }
        Relationships: []
      }
      v_public_stats: {
        Row: {
          cadres_count: number | null
          corruption_count: number | null
          problems_count: number | null
          reports_last_4h: number | null
          resolved_count: number | null
          resolved_last_24h: number | null
          suggestions_count: number | null
          suggestions_last_4h: number | null
          welfare_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_sla_breach: { Args: { _problem_id: string }; Returns: undefined }
      bt_can_start: { Args: { _task_id: string }; Returns: boolean }
      bt_task_satisfied: { Args: { _task_id: string }; Returns: boolean }
      can_current_cadre_access_assignment: {
        Args: { _problem_id: string }
        Returns: boolean
      }
      can_current_cadre_access_corruption: {
        Args: { _corruption_id: string }
        Returns: boolean
      }
      can_current_cadre_access_welfare: {
        Args: { _welfare_id: string }
        Returns: boolean
      }
      can_edit_assignment: { Args: { _problem_id: string }; Returns: boolean }
      can_view_assignment: { Args: { _problem_id: string }; Returns: boolean }
      compute_tier: { Args: { _points: number }; Returns: string }
      current_cadre_id: { Args: never; Returns: string }
      current_officer_department: { Args: never; Returns: string }
      enqueue_email: {
        Args: { _problem_id: string; _trigger: string }
        Returns: number
      }
      enqueue_sms: {
        Args: { _problem_id: string; _trigger: string }
        Returns: number
      }
      fire_edge_fn: { Args: { _body: Json; _fn: string }; Returns: number }
      get_cadre_leaderboard: {
        Args: { _constituency?: string; _limit?: number }
        Returns: {
          city: string
          constituency: string
          id: string
          level: string
          name: string
          points: number
          profile_photo_url: string
          rank_tier: string
          resolved_count: number
          stars: number
        }[]
      }
      get_city_breakdown: {
        Args: { _city: string }
        Returns: {
          category: string
          resolved: number
          total: number
        }[]
      }
      get_city_problem_counts: {
        Args: never
        Returns: {
          city: string
          pending: number
          resolved: number
          total: number
        }[]
      }
      get_constituency_breakdown: {
        Args: { _constituency: string }
        Returns: {
          category: string
          resolved: number
          total: number
        }[]
      }
      get_constituency_problem_counts: {
        Args: never
        Returns: {
          constituency: string
          pending: number
          resolved: number
          total: number
        }[]
      }
      get_notification_recipients: {
        Args: { _problem_id: string; _trigger: string }
        Returns: {
          email: string
          role: string
        }[]
      }
      get_public_cadres: {
        Args: { _constituency?: string }
        Returns: {
          area: string
          city: string
          constituency: string
          id: string
          level: string
          name: string
          phone: string
          profile_photo_url: string
          public_role_label: string
          role_title: string
          show_phone: boolean
          ward_number: string
        }[]
      }
      get_public_stats: {
        Args: never
        Returns: {
          cadres_count: number
          corruption_count: number
          problems_count: number
          reports_last_4h: number
          resolved_count: number
          resolved_last_24h: number
          suggestions_count: number
          suggestions_last_4h: number
          total_submissions: number
          welfare_count: number
        }[]
      }
      get_team_leaderboard: {
        Args: { _constituency?: string; _limit?: number }
        Returns: {
          city: string
          constituency: string
          department: string
          id: string
          name: string
          points: number
          resolved_count: number
          stars: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_cadre_in_team: { Args: { _team_id: string }; Returns: boolean }
      is_current_cadre_teammate: {
        Args: { _cadre_id: string }
        Returns: boolean
      }
      refresh_cadre_workload: { Args: never; Returns: undefined }
      refresh_map_stats: { Args: never; Returns: undefined }
      refresh_public_stats: { Args: never; Returns: undefined }
      submit_corruption_report:
        | {
            Args: {
              _amount_demanded?: number
              _area?: string
              _city?: string
              _confirmed_good_faith?: boolean
              _constituency?: string
              _department?: string
              _description?: string
              _evidence_url?: string
              _evidence_urls?: string[]
              _incident_date?: string
              _incident_time?: string
              _incident_type?: string
              _office_location?: string
              _person_involved?: string
              _person_name?: string
            }
            Returns: {
              ticket_no: string
            }[]
          }
        | {
            Args: {
              _amount_demanded?: number
              _area?: string
              _belongs_to_constituency?: boolean
              _city?: string
              _confirmed_good_faith?: boolean
              _constituency?: string
              _department?: string
              _description?: string
              _evidence_url?: string
              _evidence_urls?: string[]
              _filed_by_cadre_id?: string
              _incident_date?: string
              _incident_time?: string
              _incident_type?: string
              _office_location?: string
              _person_involved?: string
              _person_name?: string
            }
            Returns: {
              ticket_no: string
            }[]
          }
      submit_fund_request:
        | {
            Args: {
              _amount_requested?: number
              _bank_details?: string
              _beneficiary_address?: string
              _beneficiary_age?: number
              _beneficiary_name: string
              _beneficiary_phone: string
              _category: string
              _city?: string
              _constituency?: string
              _disclaimer_accepted?: boolean
              _filed_by_cadre_id?: string
              _purpose: string
              _supporting_docs?: string[]
              _urgency?: string
            }
            Returns: {
              ticket_no: string
            }[]
          }
        | {
            Args: {
              _amount_requested?: number
              _bank_details?: string
              _belongs_to_constituency?: boolean
              _beneficiary_address?: string
              _beneficiary_age?: number
              _beneficiary_name: string
              _beneficiary_phone: string
              _category: string
              _city?: string
              _constituency?: string
              _disclaimer_accepted?: boolean
              _filed_by_cadre_id?: string
              _latitude?: number
              _longitude?: number
              _purpose: string
              _supporting_docs?: string[]
              _urgency?: string
              _voice_note_url?: string
            }
            Returns: {
              ticket_no: string
            }[]
          }
      submit_problem:
        | {
            Args: {
              _address_line?: string
              _area?: string
              _category: string
              _city: string
              _constituency?: string
              _department: string
              _description: string
              _photo_urls?: string[]
              _pincode: string
              _polling_booth?: string
              _reporter_age?: number
              _reporter_name: string
              _reporter_phone: string
              _title: string
              _urgency?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _address_line?: string
              _area?: string
              _belongs_to_constituency?: boolean
              _category: string
              _city: string
              _constituency?: string
              _department: string
              _description: string
              _filed_by_cadre_id?: string
              _latitude?: number
              _longitude?: number
              _photo_urls?: string[]
              _pincode: string
              _polling_booth?: string
              _reporter_age?: number
              _reporter_name: string
              _reporter_phone: string
              _title: string
              _urgency?: string
              _voice_note_url?: string
            }
            Returns: Json
          }
      submit_welfare_issue:
        | {
            Args: {
              _application_id?: string
              _area?: string
              _city: string
              _constituency?: string
              _description: string
              _months_pending?: string
              _pincode: string
              _proof_urls?: string[]
              _reporter_name: string
              _reporter_phone: string
              _scheme_name?: string
              _scheme_type: string
              _subcategory: string
              _title: string
            }
            Returns: Json
          }
        | {
            Args: {
              _application_id?: string
              _area?: string
              _belongs_to_constituency?: boolean
              _city: string
              _constituency?: string
              _description: string
              _filed_by_cadre_id?: string
              _months_pending?: string
              _pincode: string
              _proof_urls?: string[]
              _reporter_name: string
              _reporter_phone: string
              _scheme_name?: string
              _scheme_type: string
              _subcategory: string
              _title: string
              _voice_note_url?: string
            }
            Returns: Json
          }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "cadre" | "department"
      blueprint_audit_action:
        | "generated"
        | "regenerated"
        | "task_added"
        | "task_removed"
        | "task_reordered"
        | "task_edited"
        | "task_started"
        | "task_completed"
        | "task_blocked"
        | "task_skipped"
        | "owner_changed"
        | "due_changed"
        | "proof_uploaded"
      blueprint_task_priority: "low" | "medium" | "high" | "critical"
      blueprint_task_status:
        | "pending"
        | "in_progress"
        | "blocked"
        | "done"
        | "skipped"
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
      app_role: ["admin", "moderator", "user", "cadre", "department"],
      blueprint_audit_action: [
        "generated",
        "regenerated",
        "task_added",
        "task_removed",
        "task_reordered",
        "task_edited",
        "task_started",
        "task_completed",
        "task_blocked",
        "task_skipped",
        "owner_changed",
        "due_changed",
        "proof_uploaded",
      ],
      blueprint_task_priority: ["low", "medium", "high", "critical"],
      blueprint_task_status: [
        "pending",
        "in_progress",
        "blocked",
        "done",
        "skipped",
      ],
    },
  },
} as const
