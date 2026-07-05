import { WidgetEmptyState } from '@components/common/page-builder/index.js';
import {
  BlogPostCardData,
  PostListItem
} from '@components/frontStore/blog/PostListItem.js';
import React from 'react';

// Full column ladder per setting. Blog cards carry an image + title + excerpt,
// so they need a single column on phones and only reach 3–4 columns on real
// desktops — jumping straight from 1 to 3/4 at `md` (768px) crushed them on
// tablets. 2-up fills the 640–1023px range.
const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
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
    return (
      <WidgetEmptyState
        type="featured_blogs"
        title="Featured blogs"
        hint="Pick posts to feature in the settings panel."
      />
    );
  }
  const cols = widget.columns || 3;
  const gridClass = GRID_COLS[cols] || GRID_COLS[3];

  return (
    // Match the shared band rhythm (py-6 md:py-10) and theme tokens used by
    // the other widgets, and don't self-apply `page-width` — it double-pads /
    // re-centers when the widget is dropped inside a Section or Columns. Width
    // comes from the surrounding Area/Section like every other widget.
    <div className="featured-blogs py-6 md:py-10">
      {widget.eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70">
          {widget.eyebrow}
        </p>
      )}
      {widget.heading && (
        <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          {widget.heading}
        </h2>
      )}
      {widget.subText && (
        <p className="mt-2 mb-6 text-muted-foreground">{widget.subText}</p>
      )}
      <div className={`mt-6 grid ${gridClass} gap-8`}>
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
