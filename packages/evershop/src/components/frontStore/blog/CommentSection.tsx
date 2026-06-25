import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';

export interface CommentData {
  uuid: string;
  name: string;
  comment: string;
  createdAt?: string | null;
  likeCount: number;
  liked: boolean;
  replies?: CommentData[];
}

/** Plain text (sanitized server-side) rendered as text nodes; preserve breaks. */
function CommentText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

function CommentItem({
  comment,
  depth,
  onReply
}: {
  comment: CommentData;
  depth: number;
  onReply: (c: CommentData) => void;
}) {
  const [likeCount, setLikeCount] = React.useState(comment.likeCount);
  const [liked, setLiked] = React.useState(comment.liked);
  const [busy, setBusy] = React.useState(false);

  const like = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await axios.post(`/api/blog/comments/${comment.uuid}/like`);
      const data = res.data?.data;
      if (data) {
        setLikeCount(data.likeCount);
        setLiked(data.liked);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={depth > 0 ? 'ml-6 mt-4 border-l border-gray-200 pl-4' : 'mt-6'}>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{comment.name}</span>
        {comment.createdAt && (
          <span className="text-gray-400">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="text-gray-700 mt-1">
        <CommentText text={comment.comment} />
      </div>
      <div className="flex gap-4 mt-1 text-sm text-gray-500">
        <button
          type="button"
          onClick={like}
          className={liked ? 'text-blue-600' : 'hover:underline'}
        >
          ♥ {likeCount}
        </button>
        {depth < 2 && (
          <button
            type="button"
            onClick={() => onReply(comment)}
            className="hover:underline"
          >
            {_('Reply')}
          </button>
        )}
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.uuid}
          comment={reply}
          depth={depth + 1}
          onReply={onReply}
        />
      ))}
    </div>
  );
}

function countComments(list: CommentData[]): number {
  return list.reduce(
    (n, c) => n + 1 + countComments(c.replies || []),
    0
  );
}

export function CommentSection({
  postUuid,
  comments = [],
  commentPolicy
}: {
  postUuid: string;
  comments?: CommentData[];
  commentPolicy?: string;
}) {
  const [replyTo, setReplyTo] = React.useState<CommentData | null>(null);
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    comment: '',
    website: ''
  });
  const [message, setMessage] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const total = countComments(comments);
  const closed = commentPolicy === 'closed';

  // When comments are closed, hide the whole section (heading, list, and form)
  // — no storefront note.
  if (closed) {
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await axios.post('/api/blog/comments', {
        post_uuid: postUuid,
        parent_uuid: replyTo?.uuid || null,
        name: form.name,
        email: form.email,
        comment: form.comment,
        website: form.website
      });
      const data = res.data?.data;
      if (data?.status === 'approved') {
        window.location.reload();
        return;
      }
      setMessage({
        type: 'success',
        text: _('Thanks! Your comment is awaiting moderation.')
      });
      setForm({ name: '', email: '', comment: '', website: '' });
      setReplyTo(null);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text:
          err?.response?.data?.error?.message ||
          _('Something went wrong. Please try again.')
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="blog-comments mt-12 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">
        {_('Comments')} ({total})
      </h2>
      {comments.length === 0 && (
        <p className="text-gray-500">{_('No comments yet. Be the first!')}</p>
      )}
      {comments.map((c) => (
        <CommentItem key={c.uuid} comment={c} depth={0} onReply={setReplyTo} />
      ))}

      <form onSubmit={submit} className="mt-8 space-y-3">
          <h3 className="text-lg font-semibold">
            {replyTo
              ? _('Reply to ${name}', { name: replyTo.name })
              : _('Leave a comment')}
          </h3>
          {replyTo && (
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-sm text-blue-600"
            >
              {_('Cancel reply')}
            </button>
          )}
          {message && (
            <div
              className={
                message.type === 'success' ? 'text-green-700' : 'text-red-600'
              }
            >
              {message.text}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              placeholder={_('Name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <input
              required
              type="email"
              placeholder={_('Email (not published)')}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <textarea
            required
            placeholder={_('Your comment')}
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          {/* Honeypot — hidden from humans, bots fill it. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="hidden"
            aria-hidden="true"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-gray-900 text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {submitting ? _('Submitting…') : _('Post comment')}
          </button>
        </form>
    </section>
  );
}
