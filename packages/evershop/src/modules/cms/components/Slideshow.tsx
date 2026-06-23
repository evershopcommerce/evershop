import { Image } from '@components/common/Image.js';
import {
  Editable,
  EditableImageOverlay
} from '@components/common/page-builder/index.js';
import { buttonVariants } from '@components/common/ui/Button.js';
import React, { useEffect, useRef, useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';

type ContentAnchor =
  | 'tl' | 'tc' | 'tr'
  | 'ml' | 'mc' | 'mr'
  | 'bl' | 'bc' | 'br';

type OverlayTint = 'none' | 'dark' | 'light' | 'gradient';
type AspectRatio = 'auto' | '16:9' | '21:9' | '4:3' | '1:1';
type ArrowsStyle = 'bottom-right' | 'sides' | 'hidden';
type DotsStyle = 'dots' | 'bars' | 'numbers' | 'hidden';
// Slide CTA appearance — maps 1:1 to the shadcn `Button` variants. Legacy
// data may still carry the prior values `filled` / `outline` / `link` from
// before the variant migration; `resolveButtonVariant` translates them.
type ButtonStyle =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link'
  // Legacy values kept in the union so old saved settings type-check.
  | 'filled';

function resolveButtonVariant(
  raw: string | undefined
): 'default' | 'secondary' | 'outline' | 'ghost' | 'link' {
  switch (raw) {
    case 'secondary':
      return 'secondary';
    case 'outline':
      return 'outline';
    case 'ghost':
      return 'ghost';
    case 'link':
      return 'link';
    case 'default':
    case 'filled':
    case undefined:
    default:
      return 'default';
  }
}

interface SlideData {
  id: string;
  image: string;
  mobileImage?: string;
  width?: number;
  height?: number;
  eyebrow?: string;
  headline?: string;
  subText?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonStyle?: ButtonStyle;
  button2Text?: string;
  button2Link?: string;
  button2Style?: ButtonStyle;
  contentPosition?: ContentAnchor;
  overlayTint?: OverlayTint;
  overlayOpacity?: number;
  wholeSlideLink?: boolean;
  hidden?: boolean;
}

interface SlideshowProps {
  slideshowWidget: {
    slides: SlideData[];
    autoplay?: boolean;
    autoplaySpeed?: number;
    arrows?: boolean;
    dots?: boolean;
    transition?: 'slide' | 'fade';
    transitionSpeed?: number;
    pauseOnHover?: boolean;
    pauseOnInteraction?: boolean;
    arrowsStyle?: ArrowsStyle;
    dotsStyle?: DotsStyle;
    aspectRatio?: AspectRatio;
    defaultContentPosition?: ContentAnchor;
    defaultOverlayTint?: OverlayTint;
    defaultOverlayOpacity?: number;
  };
}

// For a `flex flex-col` container: `justify-*` controls the MAIN axis
// (vertical), `items-*` controls the CROSS axis (horizontal). Earlier
// version had these swapped, so e.g. `tc` (top-center) rendered as
// middle-left. Text alignment ships separately so the inner block uses the
// same horizontal alignment as the column itself.
const POSITION_CLASS: Record<ContentAnchor, { box: string; text: string }> = {
  tl: { box: 'justify-start items-start', text: 'text-left' },
  tc: { box: 'justify-start items-center', text: 'text-center' },
  tr: { box: 'justify-start items-end', text: 'text-right' },
  ml: { box: 'justify-center items-start', text: 'text-left' },
  mc: { box: 'justify-center items-center', text: 'text-center' },
  mr: { box: 'justify-center items-end', text: 'text-right' },
  bl: { box: 'justify-end items-start', text: 'text-left' },
  bc: { box: 'justify-end items-center', text: 'text-center' },
  br: { box: 'justify-end items-end', text: 'text-right' }
};

const ASPECT_CLASS: Record<AspectRatio, string> = {
  auto: '',
  '16:9': 'aspect-[16/9]',
  '21:9': 'aspect-[21/9]',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square'
};

const TINT_BG: Record<Exclude<OverlayTint, 'none'>, string> = {
  dark: 'bg-black',
  light: 'bg-white',
  // Bottom-heavy gradient gives legible captions without obscuring the
  // upper half of the image. Opacity multiplier still applies via CSS var.
  gradient: 'bg-gradient-to-t from-black via-black/40 to-transparent'
};

function SlideOverlay({
  tint,
  opacity
}: {
  tint: OverlayTint;
  opacity: number;
}) {
  if (tint === 'none' || opacity <= 0) return null;
  const clamped = Math.max(0, Math.min(1, opacity));
  if (tint === 'gradient') {
    // Gradient tone is fixed top→bottom; opacity scales the whole layer
    // so a 0.5 opacity gradient still fades into transparent at the top.
    return (
      <div
        aria-hidden="true"
        className={`evershop-slideshow__overlay-tint absolute inset-0 pointer-events-none ${TINT_BG.gradient}`}
        style={{ opacity: clamped }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`evershop-slideshow__overlay-tint absolute inset-0 pointer-events-none ${TINT_BG[tint]}`}
      style={{ opacity: clamped }}
    />
  );
}

function ButtonInline({
  text,
  link,
  style,
  fieldPath,
  editable = true
}: {
  text: string;
  link: string;
  style: ButtonStyle;
  fieldPath: string;
  editable?: boolean;
}) {
  // Use the shadcn `Button` variant classes directly on the anchor so the
  // slide CTAs match every other button in the admin / storefront. No
  // per-slide hex color anymore — theming flows from the variant.
  const variant = resolveButtonVariant(style);
  return (
    <a
      href={link}
      className={`evershop-slideshow__cta ${buttonVariants({ variant, size: 'lg' })}`}
      onClick={(e) => {
        // Inline edit needs to capture clicks on the contenteditable child
        // before the anchor's navigation fires.
        if (
          (e.target as HTMLElement).closest('[contenteditable="true"]')
        ) {
          e.preventDefault();
        }
      }}
    >
      {editable ? (
        <Editable as="span" fieldPath={fieldPath}>
          {text}
        </Editable>
      ) : (
        <span>{text}</span>
      )}
    </a>
  );
}

function PrevArrow({
  onClick,
  variant
}: {
  onClick?: () => void;
  variant: 'side' | 'bottom-right';
}) {
  const positionClass =
    variant === 'side'
      ? 'absolute left-4 top-1/2 -translate-y-1/2'
      : 'absolute bottom-5 right-[70px]';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Previous slide"
      className={`${positionClass} z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

function NextArrow({
  onClick,
  variant
}: {
  onClick?: () => void;
  variant: 'side' | 'bottom-right';
}) {
  const positionClass =
    variant === 'side'
      ? 'absolute right-4 top-1/2 -translate-y-1/2'
      : 'absolute bottom-5 right-5';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Next slide"
      className={`${positionClass} z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// Style overrides for slick's default dots. We tag each indicator with a
// `pb-dot-*` class so the CSS below can target the `.slick-active li`
// parent and flip the indicator's appearance. Without this, slick paints
// its built-in `•` via `:before` over our content and the style switch is
// invisible — that was issue 6 in the merchandiser bug round.
const DOTS_STYLE_OVERRIDES = `
.slideshow-widget .slick-dots {
  display: block !important;
  width: 100% !important;
  text-align: center !important;
  list-style: none !important;
  padding: 0 !important;
  margin: 0 !important;
}
.slideshow-widget .slick-dots li {
  display: inline-block !important;
  position: relative !important;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  vertical-align: middle !important;
}
/* Slick's default .slick-dots li button is display:block width/height 20px
   that turned every bar/number into a full-row block, stacking the
   indicators vertically. Force inline-block + auto size so they flow in a
   row regardless of slick's bundled CSS. */
.slideshow-widget .slick-dots li button {
  display: inline-block !important;
  width: auto !important;
  height: auto !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  font-size: 0 !important;
  line-height: 0 !important;
}
.slideshow-widget .slick-dots li button::before {
  content: '' !important;
  display: none !important;
  opacity: 0 !important;
}
.slideshow-widget .slick-dots li .pb-dot {
  display: inline-block;
  height: 0.75rem;
  width: 0.75rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.6);
  margin: 0 0.25rem;
  transition: all 0.15s ease;
}
.slideshow-widget .slick-dots li.slick-active .pb-dot {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.25);
}
.slideshow-widget .slick-dots li .pb-dot-bar {
  display: inline-block;
  height: 0.25rem;
  width: 1.25rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.5);
  margin: 0 0.25rem;
  transition: all 0.15s ease;
}
.slideshow-widget .slick-dots li.slick-active .pb-dot-bar {
  background: rgba(255, 255, 255, 1);
  width: 2rem;
}
.slideshow-widget .slick-dots li .pb-dot-number {
  display: inline-flex;
  height: 1.5rem;
  width: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  font-weight: 500;
  margin: 0 0.25rem;
  transition: all 0.15s ease;
}
.slideshow-widget .slick-dots li.slick-active .pb-dot-number {
  background: rgba(255, 255, 255, 1);
  color: rgba(0, 0, 0, 1);
}
`;

function DotIndicator({
  style,
  index
}: {
  style: DotsStyle;
  index: number;
}) {
  // Active state is driven by `.slick-active` on the parent `<li>` via the
  // CSS injected above — we have no signal here. Render the inert form.
  if (style === 'bars') {
    return <span className="pb-dot-bar" />;
  }
  if (style === 'numbers') {
    return <span className="pb-dot-number">{index + 1}</span>;
  }
  // dots — default
  return <span className="pb-dot" />;
}

const SliderComponent = Slider as any;

export default function Slideshow({
  slideshowWidget: {
    slides = [],
    autoplay = true,
    autoplaySpeed = 3000,
    arrows = true,
    dots = true,
    transition = 'slide',
    transitionSpeed = 500,
    pauseOnHover = true,
    pauseOnInteraction = false,
    arrowsStyle,
    dotsStyle,
    aspectRatio = 'auto',
    defaultContentPosition = 'mc',
    defaultOverlayTint = 'none',
    defaultOverlayOpacity = 0.3
  }
}: SlideshowProps) {
  // Resolve effective arrow/dot styles. The legacy `arrows` / `dots`
  // booleans still work; the new style fields, when present, take
  // precedence and can carry "hidden" explicitly.
  const effectiveArrowsStyle: ArrowsStyle =
    arrowsStyle ?? (arrows ? 'bottom-right' : 'hidden');
  const effectiveDotsStyle: DotsStyle =
    dotsStyle ?? (dots ? 'dots' : 'hidden');

  // Hidden slides are filtered out of the visible list — keeps the index
  // contiguous so dot/arrow nav don't jump over invisible entries.
  const visibleSlides = slides.filter((s) => !s?.hidden);

  // `pauseOnInteraction` autopauses for ~20s after a click-driven nav, then
  // resumes. Implemented as an on/off toggle on autoplay via slick's
  // imperative API.
  const sliderRef = useRef<any>(null);
  const [pausedByUser, setPausedByUser] = useState(false);
  const resumeTimerRef = useRef<number | null>(null);
  const handleUserNav = () => {
    if (!autoplay || !pauseOnInteraction) return;
    setPausedByUser(true);
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = window.setTimeout(() => {
      setPausedByUser(false);
    }, 20000);
  };
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  // Slick custom dots: we map both `customPaging` (per-dot rendering) and
  // `appendDots` (container) so DotsStyle drives both shape and layout.
  // `dotsClass` provides Tailwind utility classes for the container.
  const settings = {
    dots: effectiveDotsStyle !== 'hidden',
    infinite: true,
    speed: Math.max(200, Math.min(1500, transitionSpeed)),
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: Boolean(autoplay) && !pausedByUser,
    autoplaySpeed: Math.max(1000, Number(autoplaySpeed) || 3000),
    arrows: effectiveArrowsStyle !== 'hidden',
    fade: transition === 'fade',
    pauseOnHover: Boolean(pauseOnHover),
    adaptiveHeight: aspectRatio === 'auto',
    nextArrow:
      effectiveArrowsStyle !== 'hidden' ? (
        <NextArrow
          variant={effectiveArrowsStyle === 'sides' ? 'side' : 'bottom-right'}
        />
      ) : undefined,
    prevArrow:
      effectiveArrowsStyle !== 'hidden' ? (
        <PrevArrow
          variant={effectiveArrowsStyle === 'sides' ? 'side' : 'bottom-right'}
        />
      ) : undefined,
    afterChange: handleUserNav,
    customPaging: (i: number) => (
      // Slick already wraps the return in `<li><button>` and adds
      // `slick-active` to the `<li>` for the current slide. So we just
      // return the indicator; the CSS in DOTS_STYLE_OVERRIDES does the
      // active styling via the parent class.
      <DotIndicator style={effectiveDotsStyle} index={i} />
    ),
    appendDots: (dotNodes: React.ReactNode) => (
      // Inner wrapper is `inline-flex` (not `block`) so the dot <li>s lay
      // out in a row regardless of how slick's bundled CSS happens to
      // style them. Outer wrapper centers that row in the available width
      // and pads room for bottom-right arrows.
      <div className="w-full flex justify-center items-center">
        <div
          className={`inline-flex items-center gap-1 ${
            effectiveArrowsStyle === 'bottom-right' ? 'pr-[120px]' : ''
          }`}
        >
          {dotNodes}
        </div>
      </div>
    ),
    dotsClass: 'slick-dots custom-dots-container'
  };

  if (!visibleSlides || visibleSlides.length === 0) {
    return null;
  }

  const containerClass = ['evershop-slideshow', 'slideshow-widget', 'relative', 'w-full'].join(' ');

  return (
    <div className={containerClass}>
      {/* Slick's bundled CSS draws default `.slick-dots li button::before`
          bullets that paint over our custom indicators. Inject the override
          rules once per page so style changes (dots/bars/numbers) actually
          reflect on the storefront. */}
      <style
         
        dangerouslySetInnerHTML={{ __html: DOTS_STYLE_OVERRIDES }}
      />
      <SliderComponent ref={sliderRef} {...settings}>
        {visibleSlides.map((slide, idx) => {
          const position = (slide.contentPosition ||
            defaultContentPosition) as ContentAnchor;
          const tint = (slide.overlayTint || defaultOverlayTint) as OverlayTint;
          const opacity =
            typeof slide.overlayOpacity === 'number'
              ? slide.overlayOpacity
              : defaultOverlayOpacity;
          const aspectClass = ASPECT_CLASS[aspectRatio] || '';
          const posClasses = POSITION_CLASS[position] || POSITION_CLASS.mc;
          const hasPrimary = !!slide.buttonText && !!slide.buttonLink;
          const hasSecondary = !!slide.button2Text && !!slide.button2Link;
          const wholeSlideHref =
            slide.wholeSlideLink && slide.buttonLink ? slide.buttonLink : null;

          // Note: we always render the slide markup the same way; only the
          // outer wrapper switches between <a> and <div> when `wholeSlideLink`
          // is on. Inline-edit handlers inside the slide call
          // `e.preventDefault()` when the click originates on a
          // contenteditable child so editing the headline / button doesn't
          // navigate.
          const inner = (
            // Mouse-only edit guard: cancels navigation when a click lands on
            // a contenteditable child (inline headline/button editing). Not a
            // keyboard-interactive control — the wrapping <a> handles activation.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            <div
              className={`evershop-slideshow__view group relative w-full overflow-hidden ${aspectClass}`}
              onClick={(e) => {
                if (
                  wholeSlideHref &&
                  (e.target as HTMLElement).closest('[contenteditable="true"]')
                ) {
                  e.preventDefault();
                }
              }}
            >
              {/* Use <picture> only when a separate mobile image exists.
                  Otherwise the existing <Image> component renders a single
                  responsive image. */}
              {slide.mobileImage ? (
                <picture>
                  {/* Mobile image is a PHONE asset: it applies below 640px
                      (Tailwind `sm`), so tablets (≥640px) get the desktop
                      image — aligned with Banner's `sm` swap. */}
                  <source
                    media="(max-width: 639px)"
                    srcSet={slide.mobileImage}
                  />
                  <Image
                    src={slide.image}
                    alt={slide.headline || 'Slideshow image'}
                    width={slide.width || 1920}
                    height={slide.height || 0}
                    className="evershop-slideshow__image"
                    style={{
                      objectFit: 'cover',
                      width: '100%',
                      height: aspectRatio === 'auto' ? 'auto' : '100%',
                      objectPosition: 'center'
                    }}
                    sizes="100vw"
                    priority={idx === 0}
                  />
                </picture>
              ) : (
                <Image
                  src={slide.image}
                  alt={slide.headline || 'Slideshow image'}
                  width={slide.width || 1920}
                  height={slide.height || 0}
                  className="evershop-slideshow__image"
                  style={{
                    objectFit: 'cover',
                    width: '100%',
                    height: aspectRatio === 'auto' ? 'auto' : '100%',
                    objectPosition: 'center'
                  }}
                  sizes="100vw"
                  priority={idx === 0}
                />
              )}

              <SlideOverlay tint={tint} opacity={opacity} />

              {(slide.eyebrow ||
                slide.headline ||
                slide.subText ||
                hasPrimary ||
                hasSecondary) && (
                <div
                  className={`evershop-slideshow__overlay absolute inset-0 z-10 flex flex-col p-4 md:p-8 ${posClasses.box}`}
                >
                  <div
                    className={`evershop-slideshow__content p-4 md:p-8 rounded-lg max-w-3xl ${posClasses.text}`}
                  >
                    {slide.eyebrow && (
                      <Editable
                        as="span"
                        fieldPath={`settings.slides.${idx}.eyebrow`}
                        className="evershop-slideshow__eyebrow inline-block uppercase tracking-widest text-xs md:text-sm text-white/90 font-semibold mb-2 drop-shadow"
                      >
                        {slide.eyebrow}
                      </Editable>
                    )}
                    {slide.headline && (
                      <Editable
                        as="h2"
                        fieldPath={`settings.slides.${idx}.headline`}
                        className="evershop-slideshow__heading text-white text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4 drop-shadow-lg"
                      >
                        {slide.headline}
                      </Editable>
                    )}
                    {slide.subText && (
                      <Editable
                        as="p"
                        fieldPath={`settings.slides.${idx}.subText`}
                        multiline
                        className="evershop-slideshow__subtext text-white text-sm md:text-base lg:text-lg mb-4 md:mb-8 max-w-2xl drop-shadow-md"
                      >
                        {slide.subText}
                      </Editable>
                    )}
                    {(hasPrimary || hasSecondary) && (
                      <div
                        className={`evershop-slideshow__ctas flex flex-wrap gap-3 items-center ${
                          posClasses.text === 'text-right'
                            ? 'justify-end'
                            : posClasses.text === 'text-center'
                            ? 'justify-center'
                            : 'justify-start'
                        }`}
                      >
                        {hasPrimary && (
                          <ButtonInline
                            text={slide.buttonText!}
                            link={slide.buttonLink!}
                            style={slide.buttonStyle || 'default'}
                            fieldPath={`settings.slides.${idx}.buttonText`}
                          />
                        )}
                        {hasSecondary && (
                          <ButtonInline
                            text={slide.button2Text!}
                            link={slide.button2Link!}
                            style={slide.button2Style || 'outline'}
                            fieldPath={`settings.slides.${idx}.button2Text`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <EditableImageOverlay
                empty={!slide.image}
                desktop={{
                  urlField: `settings.slides.${idx}.image`,
                  widthField: `settings.slides.${idx}.width`,
                  heightField: `settings.slides.${idx}.height`
                }}
                mobile={{ urlField: `settings.slides.${idx}.mobileImage` }}
              />
            </div>
          );

          const wrapperKey = slide.id || `slide-${idx}`;
          return (
            <div key={wrapperKey} className="evershop-slideshow__slide slide__wrapper !block">
              {wholeSlideHref ? (
                <a
                  href={wholeSlideHref}
                  className="evershop-slideshow__slide-link block"
                  aria-label={slide.headline || `Slide ${idx + 1}`}
                >
                  {inner}
                </a>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </SliderComponent>
    </div>
  );
}

export const query = `
  query Query(
    $slides: [SlideInput]
    $autoplay: Boolean
    $autoplaySpeed: Int
    $arrows: Boolean
    $dots: Boolean
    $transition: String
    $transitionSpeed: Int
    $pauseOnHover: Boolean
    $pauseOnInteraction: Boolean
    $arrowsStyle: String
    $dotsStyle: String
    $aspectRatio: String
    $defaultContentPosition: String
    $defaultOverlayTint: String
    $defaultOverlayOpacity: Float
  ) {
    slideshowWidget(
      slides: $slides
      autoplay: $autoplay
      autoplaySpeed: $autoplaySpeed
      arrows: $arrows
      dots: $dots
      transition: $transition
      transitionSpeed: $transitionSpeed
      pauseOnHover: $pauseOnHover
      pauseOnInteraction: $pauseOnInteraction
      arrowsStyle: $arrowsStyle
      dotsStyle: $dotsStyle
      aspectRatio: $aspectRatio
      defaultContentPosition: $defaultContentPosition
      defaultOverlayTint: $defaultOverlayTint
      defaultOverlayOpacity: $defaultOverlayOpacity
    ) {
      slides {
        id
        image
        width
        height
        mobileImage
        eyebrow
        headline
        subText
        buttonText
        buttonLink
        buttonStyle
        button2Text
        button2Link
        button2Style
        contentPosition
        overlayTint
        overlayOpacity
        wholeSlideLink
        hidden
      }
      autoplay
      autoplaySpeed
      arrows
      dots
      transition
      transitionSpeed
      pauseOnHover
      pauseOnInteraction
      arrowsStyle
      dotsStyle
      aspectRatio
      defaultContentPosition
      defaultOverlayTint
      defaultOverlayOpacity
    }
  }
`;

export const fragments = `
  fragment SlideData on Slide {
    id
    image
    width
    height
    mobileImage
    eyebrow
    headline
    subText
    buttonText
    buttonLink
    buttonStyle
    button2Text
    button2Link
    button2Style
    contentPosition
    overlayTint
    overlayOpacity
    wholeSlideLink
    hidden
  }
`;

export const variables = `{
  slides: getWidgetSetting("slides"),
  autoplay: getWidgetSetting("autoplay"),
  autoplaySpeed: getWidgetSetting("autoplaySpeed"),
  arrows: getWidgetSetting("arrows"),
  dots: getWidgetSetting("dots"),
  transition: getWidgetSetting("transition"),
  transitionSpeed: getWidgetSetting("transitionSpeed"),
  pauseOnHover: getWidgetSetting("pauseOnHover"),
  pauseOnInteraction: getWidgetSetting("pauseOnInteraction"),
  arrowsStyle: getWidgetSetting("arrowsStyle"),
  dotsStyle: getWidgetSetting("dotsStyle"),
  aspectRatio: getWidgetSetting("aspectRatio"),
  defaultContentPosition: getWidgetSetting("defaultContentPosition"),
  defaultOverlayTint: getWidgetSetting("defaultOverlayTint"),
  defaultOverlayOpacity: getWidgetSetting("defaultOverlayOpacity")
}`;
