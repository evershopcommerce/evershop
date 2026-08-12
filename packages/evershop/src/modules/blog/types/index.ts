/**
 * Module-local DB row types for the blog module (spec §4). Kept local rather
 * than added to types/db so the module stays self-contained; the typed
 * EventDataRegistry registration is deferred (services use the untyped emit()
 * string overload for now).
 */

export interface BlogPostRow {
  blog_post_id: number;
  uuid: string;
  status: number;
  category_id: number | null;
  author_id: number | null;
  thumbnail: string | null;
  reaction_counts: Record<string, number>;
  comment_count: number;
  reading_time: number | null;
  published_at: string | null;
  meta_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BlogPostDescriptionRow {
  blog_post_description_id: number;
  blog_post_description_blog_post_id: number;
  name: string;
  short_description: string | null;
  description: string | null;
  url_key: string;
  meta_title: string | null;
  meta_description: string | null;
}

export interface BlogCategoryRow {
  blog_category_id: number;
  uuid: string;
  status: number;
  comment_policy: string;
  position: number | null;
  meta_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BlogCategoryDescriptionRow {
  blog_category_description_id: number;
  blog_category_description_blog_category_id: number;
  name: string;
  short_description: string | null;
  url_key: string;
  meta_title: string | null;
  meta_description: string | null;
}

export interface BlogTagRow {
  blog_tag_id: number;
  uuid: string;
  name: string;
  url_key: string;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

export interface BlogCommentRow {
  blog_comment_id: number;
  uuid: string;
  post_id: number;
  parent_id: number | null;
  customer_id: number | null;
  name: string;
  email: string;
  comment: string;
  status: string;
  like_count: number;
  created_at: string;
}

export type BlogPost = BlogPostRow & BlogPostDescriptionRow;
