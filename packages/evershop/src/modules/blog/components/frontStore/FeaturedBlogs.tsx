import {
  BlogPostCardData,
  PostListItem
} from '@components/frontStore/blog/PostListItem.js';
import React from 'react';

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4'
};

interface FeaturedBlogsProps {
  featuredBlogsWidget?: {
    eyebrow?: string | null;
    heading?: string | null;
    subText?: string | null;
    columns?: number | null;
    posts?: BlogPostCardData[];
  } | null;
}

export default function FeaturedBlogs({
  featuredBlogsWidget
}: FeaturedBlogsProps) {
  const widget = featuredBlogsWidget;
  if (!widget || !widget.posts || widget.posts.length === 0) {
    return null;
  }
  const cols = widget.columns || 3;
  const gridClass = GRID_COLS[cols] || GRID_COLS[3];

  return (
    <div className="featured-blogs page-width py-8">
      {widget.eyebrow && (
        <p className="text-sm uppercase tracking-wide text-gray-500">
          {widget.eyebrow}
        </p>
      )}
      {widget.heading && (
        <h2 className="text-2xl font-bold mb-2">{widget.heading}</h2>
      )}
      {widget.subText && (
        <p className="text-gray-600 mb-6">{widget.subText}</p>
      )}
      <div className={`grid grid-cols-1 ${gridClass} gap-8`}>
        {widget.posts.map((post) => (
          <PostListItem key={post.uuid} post={post} />
        ))}
      </div>
    </div>
  );
}

export const query = `
  query Query(
    $eyebrow: String
    $heading: String
    $subText: String
    $postUuids: [String]
    $count: Int
    $columns: Int
  ) {
    featuredBlogsWidget(
      eyebrow: $eyebrow
      heading: $heading
      subText: $subText
      postUuids: $postUuids
      count: $count
      columns: $columns
    ) {
      eyebrow
      heading
      subText
      columns
      posts {
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

export const variables = `{
  eyebrow: getWidgetSetting("eyebrow"),
  heading: getWidgetSetting("heading"),
  subText: getWidgetSetting("subText"),
  postUuids: getWidgetSetting("postUuids"),
  count: getWidgetSetting("count"),
  columns: getWidgetSetting("columns")
}`;
