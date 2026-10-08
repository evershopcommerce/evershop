import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../../../../components/common/context/app.js';
import { BlogListData, BlogListProvider } from '../../../../components/frontStore/blog/BlogListContext.js';
import { BlogPostData, BlogPostProvider } from '../../../../components/frontStore/blog/BlogPostContext.js';
import BlogCategoryHeader, { layout as categoryHeaderLayout } from '../../pages/frontStore/blogCategoryView/BlogCategoryHeader.js';
import BlogListPagination, { layout as paginationLayout } from '../../pages/frontStore/blogHome+blogCategoryView+blogTagView/BlogListPagination.js';
import BlogPosts, { layout as postsLayout } from '../../pages/frontStore/blogHome+blogCategoryView+blogTagView/BlogPosts.js';
import BlogHomeHeader, { layout as homeHeaderLayout } from '../../pages/frontStore/blogHome/BlogHomeHeader.js';
import BlogPostBody, { layout as bodyLayout } from '../../pages/frontStore/blogPostView/BlogPostBody.js';
import BlogPostComments, { layout as commentsLayout } from '../../pages/frontStore/blogPostView/BlogPostComments.js';
import BlogPostHeader, { layout as postHeaderLayout } from '../../pages/frontStore/blogPostView/BlogPostHeader.js';
import BlogPostReactions, { layout as reactionsLayout } from '../../pages/frontStore/blogPostView/BlogPostReactions.js';
import BlogPostRelated, { layout as relatedLayout } from '../../pages/frontStore/blogPostView/BlogPostRelated.js';
import BlogPostShare, { layout as shareLayout } from '../../pages/frontStore/blogPostView/BlogPostShare.js';
import BlogPostTags, { layout as tagsLayout } from '../../pages/frontStore/blogPostView/BlogPostTags.js';
import BlogPostThumbnail, { layout as thumbnailLayout } from '../../pages/frontStore/blogPostView/BlogPostThumbnail.js';
import BlogTagHeader, { layout as tagHeaderLayout } from '../../pages/frontStore/blogTagView/BlogTagHeader.js';

// The blog shells own the query, the provider and the Areas; these blocks
// register into the Areas so `themes/<id>/layouts.json` can move them. The
// list and pagination blocks are shared by the three listing routes.
const posts = [1, 2, 3].map((n) => ({
  uuid: `p-${n}`,
  name: `Post ${n}`,
  url: `/blog/post-${n}`,
  shortDescription: `Summary ${n}`,
  thumbnail: null,
  publishedAt: '2026-09-01T00:00:00.000Z',
  readingTime: n,
  author: { fullName: 'Ada' }
}));
const appState = { config: { pageMeta: { route: { id: 'blogHome' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<
  typeof AppProvider
>['value'];
const inList = (list: Partial<BlogListData>, el: React.ReactElement) =>
  renderToStaticMarkup(
    <AppProvider value={appState}>
      <BlogListProvider list={{ kind: 'home', items: posts, total: 3, currentPage: 1, ...list } as BlogListData}>{el}</BlogListProvider>
    </AppProvider>
  );
const post = {
  uuid: 'post-1',
  name: 'How a coat is made',
  url: '/blog/how-a-coat-is-made',
  description: [],
  readingTime: 4,
  publishedAt: '2026-09-01T00:00:00.000Z',
  thumbnail: '/assets/coat.jpg',
  author: { fullName: 'Ada' },
  category: { name: 'Craft', url: '/blog/category/craft' },
  tags: [{ name: 'wool', url: '/blog/tag/wool' }],
  related: posts,
  reactions: [],
  comments: []
} as unknown as BlogPostData;
const inPost = (el: React.ReactElement, override: Partial<BlogPostData> = {}) =>
  renderToStaticMarkup(
    <AppProvider value={appState}>
      <BlogPostProvider post={{ ...post, ...override }}>{el}</BlogPostProvider>
    </AppProvider>
  );

describe('blog listing blocks', () => {
  it('keep the default slots the shells had when the pieces were inline', () => {
    expect(homeHeaderLayout).toEqual({ areaId: 'blogListHeader', sortOrder: 10 });
    expect(categoryHeaderLayout).toEqual({ areaId: 'blogListHeader', sortOrder: 10 });
    expect(tagHeaderLayout).toEqual({ areaId: 'blogListHeader', sortOrder: 10 });
    expect(postsLayout).toEqual({ areaId: 'blogListContent', sortOrder: 10 });
    expect(paginationLayout).toEqual({ areaId: 'blogListContent', sortOrder: 20 });
  });

  it('render the headers from the list context', () => {
    expect(inList({}, <BlogHomeHeader />)).toContain('Blog');
    const category = inList({ kind: 'category', name: 'Care', description: 'Keep it well.' }, <BlogCategoryHeader />);
    expect(category).toContain('Care');
    expect(category).toContain('Keep it well.');
    expect(inList({ kind: 'tag', name: 'linen' }, <BlogTagHeader />)).toContain('#linen');
  });

  it('render the grid, or the empty message of the listing kind', () => {
    expect(inList({}, <BlogPosts />)).toContain('Post 2');
    expect(inList({ items: [] }, <BlogPosts />)).toContain('No posts published yet.');
    expect(inList({ kind: 'category', items: [] }, <BlogPosts />)).toContain('No posts in this category yet.');
    expect(inList({ kind: 'tag', items: [] }, <BlogPosts />)).toContain('No posts with this tag yet.');
  });

  it('paginate only a non-empty list that spans several pages', () => {
    expect(inList({ items: [] }, <BlogListPagination />)).toBe('');
    expect(inList({ total: 3 }, <BlogListPagination />)).toBe('');
    expect(inList({ total: 45, currentPage: 2 }, <BlogListPagination />).length).toBeGreaterThan(0);
  });

  it('throw outside a listing shell, so a wrong layouts.json placement fails loudly', () => {
    expect(() => renderToStaticMarkup(<BlogPosts />)).toThrow('within a BlogListProvider');
  });
});

describe('blog post blocks', () => {
  it('keep the default slots and order the shell had when the pieces were inline', () => {
    expect(postHeaderLayout).toEqual({ areaId: 'blogPostArticle', sortOrder: 10 });
    expect(thumbnailLayout).toEqual({ areaId: 'blogPostArticle', sortOrder: 20 });
    expect(bodyLayout).toEqual({ areaId: 'blogPostArticle', sortOrder: 30 });
    expect(tagsLayout).toEqual({ areaId: 'blogPostArticle', sortOrder: 40 });
    expect(reactionsLayout).toEqual({ areaId: 'blogPostArticle', sortOrder: 50 });
    expect(shareLayout).toEqual({ areaId: 'blogPostArticle', sortOrder: 60 });
    expect(relatedLayout).toEqual({ areaId: 'blogPostBottom', sortOrder: 10 });
    expect(commentsLayout).toEqual({ areaId: 'blogPostBottom', sortOrder: 20 });
  });

  it('render from the post context, and skip optional pieces the post lacks', () => {
    const header = inPost(<BlogPostHeader />);
    expect(header).toContain('How a coat is made');
    expect(header).toContain('Craft');
    expect(inPost(<BlogPostThumbnail />)).toContain('/assets/coat.jpg');
    expect(inPost(<BlogPostThumbnail />, { thumbnail: null })).toBe('');
    expect(inPost(<BlogPostBody />)).toContain('editor__html');
    expect(inPost(<BlogPostTags />)).toContain('#wool');
    expect(inPost(<BlogPostTags />, { tags: [] })).toBe('');
    expect(inPost(<BlogPostRelated />)).toContain('Related posts');
    expect(inPost(<BlogPostRelated />, { related: [] })).toBe('');
    expect(() => inPost(<BlogPostReactions />)).not.toThrow();
    expect(() => inPost(<BlogPostShare />)).not.toThrow();
    expect(() => inPost(<BlogPostComments />)).not.toThrow();
  });

  it('throw outside the post shell, so a wrong layouts.json placement fails loudly', () => {
    expect(() => renderToStaticMarkup(<BlogPostHeader />)).toThrow('within a BlogPostProvider');
  });
});
