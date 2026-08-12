 
import { Editable } from '@components/common/page-builder/index.js';
import React, { useEffect, useRef } from 'react';

/**
 * Announcement bar — a thin row of one or more rotating announcements. A
 * single announcement renders statically; multiple announcements cycle
 * upward at the configured interval.
 *
 * Why a `useEffect` rather than an inline <script>: widgets in the
 * page-builder preview iframe mount client-side, not via the initial SSR
 * payload. Browsers don't execute <script> elements that React inserts
 * into the DOM, so the inline-script approach silently no-ops there. An
 * effect runs the same rotation logic on mount and works in both the
 * preview and on the live storefront.
 *
 * Respects `prefers-reduced-motion` — cross-fades instead of sliding.
 */

export interface AnnouncementLink {
  url: string;
  label: string;
  newTab: boolean;
}

export interface Announcement {
  id: string;
  content: string;
  link: AnnouncementLink | null;
}

export interface AnnouncementBarProps {
  announcementBarWidget: {
    backgroundColor: string;
    textColor: string;
    delay: number;
    announcements: Announcement[];
  };
}

// Default state for every slide: off-screen below (translateY(100%), opacity
// 0). Only `is-active` brings it on-screen. `is-leaving` parks it off-screen
// above so it can transition out without snapping. The SSR-rendered first
// slide carries `is-active`; the others have no class and start hidden.
const ROTATION_STYLES = `
  [data-evershop-announcement] {
    overflow: hidden;
    position: relative;
    height: 40px;
  }
  [data-evershop-announcement-slide] {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 400ms ease, opacity 400ms ease;
    transform: translateY(100%);
    opacity: 0;
  }
  [data-evershop-announcement-slide].is-active {
    transform: translateY(0);
    opacity: 1;
  }
  [data-evershop-announcement-slide].is-leaving {
    transform: translateY(-100%);
    opacity: 0;
  }
  [data-evershop-announcement-slide].is-no-transition {
    transition: none;
  }
  @media (prefers-reduced-motion: reduce) {
    [data-evershop-announcement-slide] {
      transition: opacity 200ms ease;
      transform: none !important;
      opacity: 0;
    }
    [data-evershop-announcement-slide].is-active {
      opacity: 1;
    }
  }
`;

function Inner({
  content,
  link,
  originalIndex
}: Announcement & { originalIndex: number }) {
  const fieldPath = `settings.announcements.${originalIndex}.content`;
  if (!link || !link.url) {
    return (
      <Editable as="span" fieldPath={fieldPath} className="evershop-announcement-bar__content px-4 text-center text-sm">
        {content}
      </Editable>
    );
  }
  return (
    <a
      href={link.url}
      target={link.newTab ? '_blank' : undefined}
      rel={link.newTab ? 'noopener noreferrer' : undefined}
      className="evershop-announcement-bar__link block w-full px-4 text-center text-sm hover:opacity-80"
    >
      <Editable as="span" fieldPath={fieldPath} className="evershop-announcement-bar__content">
        {content}
      </Editable>
      {link.label && link.label !== content && (
        <span className="evershop-announcement-bar__label ml-1 underline underline-offset-2">{link.label}</span>
      )}
    </a>
  );
}

export default function AnnouncementBar({
  announcementBarWidget
}: AnnouncementBarProps) {
  const {
    backgroundColor,
    textColor,
    delay,
    announcements = []
  } = announcementBarWidget;
  // Track the source index so inline edits hit `settings.announcements.${originalIndex}.content`.
  const visible = (announcements ?? [])
    .map((a, originalIndex) => ({ a, originalIndex }))
    .filter(({ a }) => a && a.content);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Rotation loop. Mirrors the state-machine described at the top of the
  // file: default (off-screen below) → is-active → is-leaving. Re-runs
  // when the number of slides or the delay changes so a settings edit in
  // the page-builder picks up immediately.
  useEffect(() => {
    if (visible.length < 2) return;
    const root = rootRef.current;
    if (!root) return;
    const slides = Array.from(
      root.querySelectorAll<HTMLElement>('[data-evershop-announcement-slide]')
    );
    if (slides.length < 2) return;

    const safeDelay = Math.max(1000, delay || 4000);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0;

    const advance = () => {
      const prev = i;
      i = (i + 1) % slides.length;
      if (prev === i) return;

      if (reduce) {
        slides.forEach((s, idx) => {
          s.classList.remove('is-leaving');
          s.classList.toggle('is-active', idx === i);
        });
        return;
      }

      // Wrap-around: incoming slide may still carry `is-leaving` from a
      // previous rotation (parked above). Teleport back to the default
      // below-position with no transition so it can slide up properly.
      if (slides[i].classList.contains('is-leaving')) {
        slides[i].classList.add('is-no-transition');
        slides[i].classList.remove('is-leaving');
        // Force reflow so the no-transition state actually applies before
        // we re-enable transitions.
        void slides[i].offsetHeight;
        slides[i].classList.remove('is-no-transition');
      }

      slides[prev].classList.remove('is-active');
      slides[prev].classList.add('is-leaving');
      slides[i].classList.add('is-active');
    };

    let timer: ReturnType<typeof setInterval> | null = setInterval(
      advance,
      safeDelay + 400
    );
    const onVisibility = () => {
      if (document.hidden) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      } else if (!timer) {
        timer = setInterval(advance, safeDelay + 400);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [visible.length, delay]);

  if (visible.length === 0) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ROTATION_STYLES }} />
      <div
        ref={rootRef}
        data-evershop-announcement
        className="evershop-announcement-bar w-full"
        style={{
          backgroundColor: backgroundColor || '#000000',
          color: textColor || '#ffffff'
        }}
      >
        {visible.map(({ a, originalIndex }, i) => (
          <div
            key={a.id}
            data-evershop-announcement-slide
            className={`evershop-announcement-bar__item${i === 0 ? ' is-active' : ''}`}
          >
            <Inner {...a} originalIndex={originalIndex} />
          </div>
        ))}
      </div>
    </>
  );
}

export const query = `
  query Query(
    $backgroundColor: String
    $textColor: String
    $delay: Float
    $announcements: JSON
  ) {
    announcementBarWidget(
      backgroundColor: $backgroundColor
      textColor: $textColor
      delay: $delay
      announcements: $announcements
    ) {
      backgroundColor
      textColor
      delay
      announcements
    }
  }
`;

export const variables = `{
  backgroundColor: getWidgetSetting("backgroundColor", "#000000"),
  textColor: getWidgetSetting("textColor", "#ffffff"),
  delay: getWidgetSetting("delay", 4000),
  announcements: getWidgetSetting("announcements", [])
}`;
