import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';

export interface ReactionCount {
  type: string;
  count: number;
  reacted: boolean;
}

const EMOJI: Record<string, string> = {
  like: '👍',
  love: '❤️',
  clap: '👏',
  insightful: '💡'
};

export function ReactionBar({
  postUuid,
  reactions: initial
}: {
  postUuid: string;
  reactions?: ReactionCount[];
}) {
  const [reactions, setReactions] = React.useState<ReactionCount[]>(
    initial || []
  );
  const [busy, setBusy] = React.useState(false);

  const react = async (type: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await axios.post(`/api/blog/posts/${postUuid}/react`, {
        type
      });
      const data = res.data?.data;
      if (data) {
        const counts = data.counts || {};
        setReactions((prev) =>
          prev.map((r) => ({
            ...r,
            count: counts[r.type] ?? 0,
            reacted: r.type === data.reacted
          }))
        );
      }
    } finally {
      setBusy(false);
    }
  };

  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className="blog-reactions flex flex-wrap items-center gap-2 mt-8">
      <span className="text-sm text-gray-500 mr-1">{_('React')}:</span>
      {reactions.map((r) => (
        <button
          key={r.type}
          type="button"
          onClick={() => react(r.type)}
          className={`flex items-center gap-1 border rounded-full px-3 py-1 text-sm transition-colors ${
            r.reacted
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          <span>{EMOJI[r.type] || '👍'}</span>
          <span className="capitalize">{r.type}</span>
          {r.count > 0 && <span className="text-gray-500">{r.count}</span>}
        </button>
      ))}
    </div>
  );
}
