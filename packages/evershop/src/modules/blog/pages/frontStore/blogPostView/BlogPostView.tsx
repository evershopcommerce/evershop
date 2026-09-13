import Area from '@components/common/Area.js';
import {
  BlogPostData,
  BlogPostProvider
} from '@components/frontStore/blog/BlogPostContext.js';
import React from 'react';

interface BlogPostViewData {
  post?: BlogPostData | null;
}

/**
 * Blog post shell. It owns the query, the `BlogPostProvider`, the article
 * column and the slots (Areas); the content is page blocks registering into
 * those slots, so a theme can re-position them from `layouts.json` without
 * overriding this file:
 *
 *   blogPostView/BlogPostHeader     → blogPostArticle 10  (back link, category, title, meta)
 *   blogPostView/BlogPostThumbnail  → blogPostArticle 20
 *   blogPostView/BlogPostBody       → blogPostArticle 30
 *   blogPostView/BlogPostTags       → blogPostArticle 40
 *   blogPostView/BlogPostReactions  → blogPostArticle 50
 *   blogPostView/BlogPostShare      → blogPostArticle 60
 *   blogPostView/BlogPostRelated    → blogPostBottom  10
 *   blogPostView/BlogPostComments   → blogPostBottom  20
 *
 * `blogPostTop` is an empty slot for extensions and widgets.
 */
export default function BlogPostView({ post }: BlogPostViewData) {
  if (!post) {
    return null;
  }
  return (
    <BlogPostProvider post={post}>
      <div className="blog-post-single py-8 md:py-12">
        <Area id="blogPostTop" noOuter />
        <article className="mx-auto max-w-3xl">
          <Area id="blogPostArticle" noOuter />
        </article>
        <Area id="blogPostBottom" noOuter />
      </div>
    </BlogPostProvider>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    post: currentBlogPost {
      uuid
      metafields {
        namespace
        key
        type
        value
      }
      name
      url
      description
      readingTime
      publishedAt
      thumbnail
      author {
        fullName
      }
      category {
        name
        url
        commentPolicy
      }
      tags {
        name
        url
      }
      reactions {
        type
        count
        reacted
      }
      comments {
        uuid
        name
        comment
        createdAt
        likeCount
        liked
        replies {
          uuid
          name
          comment
          createdAt
          likeCount
          liked
          replies {
            uuid
            name
            comment
            createdAt
            likeCount
            liked
          }
        }
      }
      related(limit: 3) {
        uuid
        name
        url
        shortDescription
        thumbnail
        publishedAt
        readingTime
        author {
          fullName
        }
      }
    }
  }
`;
