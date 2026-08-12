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
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
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
    <div className="blog-post-single py-8 md:py-12">
      <article className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <a
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {_('Back to blog')}
          </a>
        </div>

        <header className="text-center">
          {post.category && (
            <a
              href={post.category.url}
              className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              {post.category.name}
            </a>
          )}
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {post.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {post.author?.fullName && <span>{post.author.fullName}</span>}
            {post.publishedAt && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(post.publishedAt).toLocaleDateString()}
              </span>
            )}
            {post.readingTime ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readingTime} {_('min read')}
              </span>
            ) : null}
          </div>
        </header>

        {post.thumbnail && (
          <img
            src={post.thumbnail}
            alt={post.name}
            className="mt-8 w-full rounded-lg border border-border"
          />
        )}

        <div className="mt-8">
          <Editor rows={post.description || []} />
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{_('Tags')}:</span>
            {post.tags.map((tag) => (
              <a
                key={tag.url}
                href={tag.url}
                className="rounded-full bg-muted px-3 py-1 text-sm text-foreground transition-colors hover:bg-muted/70"
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
        <div className="mx-auto max-w-5xl pb-4 pt-12">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">
            {_('Related posts')}
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
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
