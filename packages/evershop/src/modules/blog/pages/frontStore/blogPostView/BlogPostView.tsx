import { Editor } from '@components/common/Editor.js';
import {
  CommentData,
  CommentSection
} from '@components/frontStore/blog/CommentSection.js';
import {
  BlogPostCardData,
  PostListItem
} from '@components/frontStore/blog/PostListItem.js';
import {
  ReactionBar,
  ReactionCount
} from '@components/frontStore/blog/ReactionBar.js';
import { ShareButtons } from '@components/frontStore/blog/ShareButtons.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface BlogPostViewData {
  post?: {
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
  } | null;
}

export default function BlogPostView({ post }: BlogPostViewData) {
  if (!post) {
    return null;
  }
  return (
    <div className="blog-post-single page-width">
      <article className="max-w-3xl mx-auto py-8">
        {post.category && (
          <a
            href={post.category.url}
            className="text-sm uppercase tracking-wide text-gray-500 hover:underline"
          >
            {post.category.name}
          </a>
        )}
        <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-3 leading-tight">
          {post.name}
        </h1>
        <div className="text-sm text-gray-500 flex flex-wrap gap-x-3 mb-6">
          {post.author?.fullName && (
            <span>
              {_('By')} {post.author.fullName}
            </span>
          )}
          {post.publishedAt && (
            <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
          )}
          {post.readingTime ? (
            <span>
              {post.readingTime} {_('min read')}
            </span>
          ) : null}
        </div>
        {post.thumbnail && (
          <img
            src={post.thumbnail}
            alt={post.name}
            className="w-full rounded-lg mb-8"
          />
        )}
        <Editor rows={post.description || []} />
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <a
                key={tag.url}
                href={tag.url}
                className="text-sm bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200"
              >
                #{tag.name}
              </a>
            ))}
          </div>
        )}
        <ReactionBar postUuid={post.uuid} reactions={post.reactions} />
        <ShareButtons url={post.url} title={post.name} />
      </article>
      {post.related && post.related.length > 0 && (
        <div className="max-w-5xl mx-auto pb-12">
          <h2 className="text-2xl font-semibold mb-6">{_('Related posts')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {post.related.map((related) => (
              <PostListItem key={related.uuid} post={related} />
            ))}
          </div>
        </div>
      )}
      <CommentSection
        postUuid={post.uuid}
        comments={post.comments}
        commentPolicy={post.category?.commentPolicy}
      />
    </div>
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
