import { Image } from '@components/common/Image.js';
import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';

function PrevArrow(props: any) {
  const { onClick } = props;
  return (
    <button
      className="absolute bottom-6 right-[4.75rem] z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-primary md:bottom-8 md:right-[5.5rem]"
      onClick={onClick}
      aria-label="Previous slide"
      type="button"
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
        className="h-6 w-6 md:h-6 md:w-6"
      >
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
  );
}

function NextArrow(props: any) {
  const { onClick } = props;
  return (
    <button
      className="absolute bottom-6 right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-primary md:bottom-8 md:right-8"
      onClick={onClick}
      aria-label="Next slide"
      type="button"
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
        className="h-6 w-6 md:h-6 md:w-6"
      >
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  );
}

function CustomDot(props: any) {
  const { onClick, active, className } = props;
  const isActive = active || (className && className.includes('active'));

  return (
    <button
      onClick={onClick}
      className={`mx-1 my-0 h-1.5 rounded-full transition-all duration-300 ${
        isActive ? 'w-7 !bg-white' : 'w-1.5 !bg-white/50 hover:!bg-white/80'
      }`}
      aria-label="Go to slide"
      type="button"
    />
  );
}

const SliderComponent = Slider as any;

interface SlideData {
  id: string;
  image: string;
  width?: number; // Image natural width (automatically detected)
  height?: number; // Image natural height (automatically detected)
  headline?: string;
  subText?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonColor?: string;
}

interface SlideshowProps {
  slideshowWidget: {
    slides: SlideData[];
    autoplay?: boolean;
    autoplaySpeed?: number;
    arrows?: boolean;
    dots?: boolean;
  };
}

export default function Slideshow({
  slideshowWidget: {
    slides = [],
    autoplay = true,
    autoplaySpeed = 3000,
    arrows = true,
    dots = true
  }
}: SlideshowProps) {
  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: Boolean(autoplay),
    autoplaySpeed: Number(autoplaySpeed) || 3000,
    arrows: Boolean(arrows),
    fade: false,
    pauseOnHover: true,
    adaptiveHeight: true,
    nextArrow: arrows ? <NextArrow /> : undefined,
    prevArrow: arrows ? <PrevArrow /> : undefined,
    customPaging: function (i: number) {
      return <CustomDot active={false} />;
    },
    appendDots: (dots: React.ReactNode) => (
      <div className="w-full flex justify-center items-center">
        <div className="pr-[140px] md:pr-[160px]">{dots}</div>
      </div>
    ),
    dotsClass: 'slick-dots custom-dots-container'
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  const containerClasses = ['slideshow-widget', 'relative', 'w-full'].join(' ');

  const containerStyle: React.CSSProperties = {
    height: 'auto',
    maxWidth: '100%'
  };

  const sliderStyle: React.CSSProperties = {
    height: 'auto' // Adaptive height for slider
  };

  return (
    <div className={containerClasses} style={containerStyle}>
      <SliderComponent {...settings} style={sliderStyle}>
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="relative lg:h-auto slide__wrapper !block"
            style={{ display: 'block' }}
          >
            <div className="relative w-full h-full">
              <Image
                src={slide.image}
                alt={slide.headline || 'Slideshow image'}
                width={slide.width || 1920} // Use individual slide width if available
                height={slide.height || 0} // Use individual slide height if available
                style={{
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%',
                  objectPosition: 'center'
                }}
                sizes="100vw"
                priority={true}
              />

              {/* Scrim keeps copy legible over any photograph */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(17,24,39,0.72) 0%, rgba(17,24,39,0.45) 42%, rgba(17,24,39,0.05) 75%)'
                }}
              />

              <div className="absolute inset-0 flex items-center">
                <div className="page-width w-full">
                  {(slide.headline ||
                    slide.subText ||
                    (slide.buttonText && slide.buttonLink)) && (
                    <div className="max-w-xl text-left">
                      {slide.headline && (
                        <h2 className="!text-white text-3xl md:text-5xl lg:text-6xl !leading-[1.05] mb-4">
                          {slide.headline}
                        </h2>
                      )}

                      {slide.subText && (
                        <p className="text-white/85 text-base md:text-lg mb-8 max-w-lg">
                          {slide.subText}
                        </p>
                      )}

                      {slide.buttonText && slide.buttonLink && (
                        <a
                          href={slide.buttonLink}
                          className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[0.9375rem] font-semibold text-primary transition-all duration-300 hover:gap-3 hover:shadow-overlay"
                          style={
                            slide.buttonColor
                              ? {
                                  backgroundColor: slide.buttonColor,
                                  color: '#fff'
                                }
                              : undefined
                          }
                        >
                          {slide.buttonText}
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M2.5 8h11m0 0L9 3.5M13.5 8 9 12.5"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </SliderComponent>
    </div>
  );
}

export const query = `
  query Query($slides: [SlideInput], $autoplay: Boolean, $autoplaySpeed: Int, $arrows: Boolean, $dots: Boolean) {
    slideshowWidget(
      slides: $slides,
      autoplay: $autoplay,
      autoplaySpeed: $autoplaySpeed,
      arrows: $arrows,
      dots: $dots
    ) {
      slides {
        id
        image
        width
        height
        headline
        subText
        buttonText
        buttonLink
        buttonColor
      }
      autoplay
      autoplaySpeed
      arrows
      dots
    }
  }
`;

export const fragments = `
  fragment SlideData on Slide {
    id
    image
    width
    height
    headline
    subText
    buttonText
    buttonLink
    buttonColor
  }
`;

export const variables = `{
  slides: getWidgetSetting("slides"),
  autoplay: getWidgetSetting("autoplay"),
  autoplaySpeed: getWidgetSetting("autoplaySpeed"),
  arrows: getWidgetSetting("arrows"),
  dots: getWidgetSetting("dots")
}`;
