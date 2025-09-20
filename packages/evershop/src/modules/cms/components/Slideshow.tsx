import { Image } from '@components/common/Image.js';
import React from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

function PrevArrow(props: any) {
  const { onClick } = props;
  return (
    <button
      className="absolute bottom-[20px] right-[70px] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 md:bottom-[20px] md:right-[70px] md:h-10 md:w-10"
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
      className="absolute bottom-[20px] right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 md:bottom-[20px] md:right-5 md:h-10 md:w-10"
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
      className={`mx-1 my-0 h-3 w-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white/50 md:h-3 md:w-3 ${
        isActive
          ? '!bg-black scale-125 shadow-md'
          : '!bg-black/70 !hover:bg-black/90'
      }`}
      aria-label="Go to slide"
      type="button"
    />
  );
}

// Only keep minimal CSS for slick slider overrides
const customSliderStyles = `
.slick-slide {
    height: auto; // ← that must not be ignored
  }
  .slick-track {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
  }
  /* Hide the default button appearance but keep functionality */
  .slideshow-widget .slick-dots li button:before {
    content: "";
    display: none;
  }
  
  /* Remove default slick-dots styling */
  .slideshow-widget .slick-dots li {
    margin: 0;
    width: auto;
    height: auto;
  }
  
  /* Custom dots container styling */
  .slideshow-widget .custom-dots-container {
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    z-index: 10;
  }
  
  /* Ensure dots stay inside the slide on all screen sizes */
  @media (max-width: 767px) {
    .slideshow-widget .custom-dots-container {
      bottom: 15px;
    }
  }
`;

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
    dots: Boolean(dots),
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: Boolean(autoplay),
    autoplaySpeed: Number(autoplaySpeed) || 3000,
    arrows: Boolean(arrows),
    fade: false, // Always use fade: false to allow smooth transitions
    pauseOnHover: true,
    adaptiveHeight: true, // Always use adaptiveHeight: true to adjust to slide dimensions
    nextArrow: arrows ? <NextArrow /> : undefined,
    prevArrow: arrows ? <PrevArrow /> : undefined,
    customPaging: function (i: number) {
      // We can't directly determine active state here, as it's managed by react-slick
      // The component will receive the active prop from the Slider
      return <CustomDot active={false} />;
    },
    appendDots: (dots: React.ReactNode) => (
      <div className="w-full flex justify-center items-center">
        <div className="pr-[120px] md:pr-[120px]">{dots}</div>
      </div>
    ),
    dotsClass: 'slick-dots custom-dots-container'
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  const containerClasses = [
    'slideshow-widget',
    'relative',
    'w-full' // Always take full width of parent container
  ].join(' ');

  // Simple styles for adaptive slideshow
  const containerStyle: React.CSSProperties = {
    height: 'auto', // Always adaptive height
    maxWidth: '100%' // Always respect parent container width
  };

  const sliderStyle: React.CSSProperties = {
    height: 'auto' // Adaptive height for slider
  };

  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = customSliderStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className={containerClasses} style={containerStyle}>
      <SliderComponent {...settings} style={sliderStyle}>
        {slides.map((slide) => (
          <div key={slide.id} className="relative h-auto">
            <div className="relative w-full">
              <Image
                src={slide.image}
                alt={slide.headline || 'Slideshow image'}
                width={slide.width || 1920} // Use individual slide width if available
                height={slide.height || 0} // Use individual slide height if available
                className={`w-full`}
                style={{ objectFit: 'contain', maxWidth: '100%' }}
                priority={true}
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 md:p-8">
                {(slide.headline ||
                  slide.subText ||
                  (slide.buttonText && slide.buttonLink)) && (
                  <div className="p-4 md:p-8 rounded-lg max-w-3xl">
                    {slide.headline && (
                      <h2 className="text-white text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4 drop-shadow-lg">
                        {slide.headline}
                      </h2>
                    )}

                    {slide.subText && (
                      <p className="text-white text-sm md:text-base lg:text-lg mb-4 md:mb-8 max-w-2xl mx-auto drop-shadow-md">
                        {slide.subText}
                      </p>
                    )}

                    {slide.buttonText && slide.buttonLink && (
                      <a
                        href={slide.buttonLink}
                        className="inline-block px-6 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90 hover:scale-105"
                        style={{
                          backgroundColor: slide.buttonColor || '#3B82F6'
                        }}
                      >
                        {slide.buttonText}
                      </a>
                    )}
                  </div>
                )}
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
