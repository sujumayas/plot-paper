/**
 * Hand-typed subset mirroring the schema in supabase/migrations/0001_schema.sql.
 * Regenerate with: `supabase gen types typescript --project-id <id> --schema public > src/lib/supabase/types.ts`
 */

import type { VizColumn, VizRow } from "@/lib/viz/types";

type ProfileRowShape = {
  id: string;
  display_name: string | null;
  created_at: string;
};

type ProfileInsertShape = {
  id: string;
  display_name?: string | null;
  created_at?: string;
};

type VizTypeRowShape = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  base_renderer_id: string;
  columns: VizColumn[];
  sample: VizRow[];
  owner_id: string | null;
  is_public: boolean;
  source_prompt: string | null;
  source_ref_url: string | null;
  created_at: string;
};

type VizTypeInsertShape = {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  category: string;
  base_renderer_id: string;
  columns: VizColumn[];
  sample?: VizRow[];
  owner_id?: string | null;
  is_public?: boolean;
  source_prompt?: string | null;
  source_ref_url?: string | null;
  created_at?: string;
};

type GraphRowShape = {
  id: string;
  title: string;
  description: string | null;
  viz_type_id: string;
  data: VizRow[];
  tags: string[];
  author_id: string;
  display_author: string | null;
  likes: number;
  remixes: number;
  views: number;
  is_published: boolean;
  forked_from: string | null;
  created_at: string;
  updated_at: string;
};

type GraphInsertShape = {
  id?: string;
  title: string;
  description?: string | null;
  viz_type_id: string;
  data: VizRow[];
  tags?: string[];
  author_id: string;
  display_author?: string | null;
  likes?: number;
  remixes?: number;
  views?: number;
  is_published?: boolean;
  forked_from?: string | null;
  created_at?: string;
  updated_at?: string;
};

type SavedTypeRowShape = {
  user_id: string;
  viz_type_id: string;
  created_at: string;
};

type SavedTypeInsertShape = {
  user_id: string;
  viz_type_id: string;
  created_at?: string;
};

type LikeRowShape = {
  user_id: string;
  graph_id: string;
  created_at: string;
};

type LikeInsertShape = {
  user_id: string;
  graph_id: string;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRowShape;
        Insert: ProfileInsertShape;
        Update: Partial<ProfileInsertShape>;
        Relationships: [];
      };
      viz_types: {
        Row: VizTypeRowShape;
        Insert: VizTypeInsertShape;
        Update: Partial<VizTypeInsertShape>;
        Relationships: [];
      };
      graphs: {
        Row: GraphRowShape;
        Insert: GraphInsertShape;
        Update: Partial<GraphInsertShape>;
        Relationships: [];
      };
      saved_types: {
        Row: SavedTypeRowShape;
        Insert: SavedTypeInsertShape;
        Update: Partial<SavedTypeInsertShape>;
        Relationships: [];
      };
      likes: {
        Row: LikeRowShape;
        Insert: LikeInsertShape;
        Update: Partial<LikeInsertShape>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_views: {
        Args: { graph_id: string };
        Returns: undefined;
      };
      toggle_like: {
        Args: { graph_id: string };
        Returns: boolean;
      };
      fork_graph: {
        Args: { source_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type GraphRow = Database["public"]["Tables"]["graphs"]["Row"];
export type VizTypeRow = Database["public"]["Tables"]["viz_types"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type GraphInsert = Database["public"]["Tables"]["graphs"]["Insert"];
export type VizTypeInsert = Database["public"]["Tables"]["viz_types"]["Insert"];

export type GraphWithVizType = GraphRow & {
  viz_types: VizTypeRow;
};
