import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Social share buttons. Resolves the canonical URL on the client (after
 * hydration) so SSR/CSR markup matches; `url` is the SSR fallback.
 */
export function ShareButtons({
  url = '',
  title
}: {
  url?: string;
  title: string;
}) {
  const [shareUrl, setShareUrl] = React.useState(url);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const enc = encodeURIComponent;
  const links = [
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(title)}`
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`
    },
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${enc(`${title} ${shareUrl}`)}`
    },
    {
      label: 'Email',
      href: `mailto:?subject=${enc(title)}&body=${enc(shareUrl)}`
    }
  ];

  return (
    <div className="blog-share flex flex-wrap items-center gap-2 mt-8">
      <span className="text-sm text-muted-foreground mr-1">{_('Share')}:</span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm border border-border rounded-full px-3 py-1 hover:bg-muted transition-colors"
        >
          {link.label}
        </a>
      ))}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="text-sm border border-border rounded-full px-3 py-1 hover:bg-muted transition-colors"
      >
        {copied ? _('Copied!') : _('Copy link')}
      </button>
    </div>
  );
}
