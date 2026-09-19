import { CommentData } from '@components/frontStore/blog/CommentSection.js';
import { BlogPostCardData } from '@components/frontStore/blog/PostListItem.js';
import { ReactionCount } from '@components/frontStore/blog/ReactionBar.js';
import React, { createContext, ReactNode, useContext } from 'react';

/** The post of a blog post page, provided by the page shell to its blocks. */
export interface BlogPostData {
  uuid: string;
  name: string;
  url?: string;
  description?: any;
  readingTime?: number;
  publishedAt?: string | null;
  thumbnail?: string | null;
  author?: { fullName?: string | null } | null;
  category?: { name: string; url: string; commentPolicy?: string } | null;
  tags?: Array<{ name: string; url: string }>;
  related?: BlogPostCardData[];
  reactions?: ReactionCount[];
  comments?: CommentData[];
}

const BlogPostContext = createContext<BlogPostData | undefined>(undefined);

export const BlogPostProvider: React.FC<{ post: BlogPostData; children: ReactNode }> = ({
  post,
  children
}) => <BlogPostContext.Provider value={post}>{children}</BlogPostContext.Provider>;

export const useBlogPost = (): BlogPostData => {
  const context = useContext(BlogPostContext);
  if (context === undefined) {
    throw new Error('useBlogPost must be used within a BlogPostProvider');
  }
  return context;
};
