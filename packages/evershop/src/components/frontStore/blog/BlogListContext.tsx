import { BlogPostCardData } from '@components/frontStore/blog/PostListItem.js';
import React, { createContext, ReactNode, useContext } from 'react';

/**
 * Data of a blog listing page (home, category, tag), provided by the page
 * shell to its blocks (`BlogPosts`, `BlogListPagination`, the header blocks).
 */
export interface BlogListData {
  kind: 'home' | 'category' | 'tag';
  /** Category or tag name; absent on the blog home. */
  name?: string;
  /** Category short description, when there is one. */
  description?: string | null;
  items: BlogPostCardData[];
  total: number;
  currentPage: number;
}

const BlogListContext = createContext<BlogListData | undefined>(undefined);

export const BlogListProvider: React.FC<{ list: BlogListData; children: ReactNode }> = ({
  list,
  children
}) => <BlogListContext.Provider value={list}>{children}</BlogListContext.Provider>;

export const useBlogList = (): BlogListData => {
  const context = useContext(BlogListContext);
  if (context === undefined) {
    throw new Error('useBlogList must be used within a BlogListProvider');
  }
  return context;
};
