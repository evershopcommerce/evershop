/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState, useRef } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Image } from '@components/common/Image.js';
import { useProduct } from '@components/frontStore/catalog/ProductContext.js';
import './Media.scss';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';

const SliderComponent = Slider as any;

type SliderType = any;

const PrevArrow = (props: any) => {
  const { className, onClick } = props;
  return (
    <button
      className={`${className} custom-arrow prev-arrow`}
      onClick={onClick}
      aria-label="Previous slide"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
};

const NextArrow = (props: any) => {
  const { className, onClick } = props;
  return (
    <button
      className={`${className} custom-arrow next-arrow`}
      onClick={onClick}
      aria-label="Next slide"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
};

interface ImageWithDimensionsProps {
  url: string;
  alt?: string;
  width: number;
  height: number;
}

interface MediaProps {
  imageSize?: {
    width: number;
    height: number;
  };
  thumbnailSize?: {
    width: number;
    height: number;
  };
  modalSize?: {
    width: number;
    height: number;
  };
}

export const Media: React.FC<MediaProps> = ({
  imageSize = { width: 600, height: 600 },
  thumbnailSize = { width: 100, height: 100 },
  modalSize = { width: 1200, height: 1200 }
}) => {
  const product = useProduct();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const mainSliderRef = useRef<SliderType>(null);
  const modalSliderRef = useRef<SliderType>(null);

  const allImages: ImageWithDimensionsProps[] = [];

  const fullscreenWidth = modalSize.width * 1.5;
  const fullscreenHeight = modalSize.height * 1.5;

  if (product.image) {
    allImages.push({
      url: product.image.url,
      alt: product.image.alt || product.name,
      width: imageSize.width,
      height: imageSize.height
    });
  }

  if (product.gallery && Array.isArray(product.gallery)) {
    product.gallery.forEach((img) => {
      allImages.push({
        url: img.url,
        alt: img.alt || product.name,
        width: imageSize.width,
        height: imageSize.height
      });
    });
  }

  const mainSliderSettings = {
    dots: allImages.length > 1,
    dotsClass: 'slick-dots slick-thumb',
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: allImages.length > 1,
    fade: false,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    beforeChange: (_: number, next: number) => {
      setActiveSlide(next);
    },
    customPaging: function (i: number) {
      return (
        <div className="thumbnail-wrapper">
          <Image
            src={allImages[i]?.url}
            alt={`Thumbnail ${i + 1}`}
            width={thumbnailSize.width}
            height={thumbnailSize.height}
            objectFit="contain"
          />
        </div>
      );
    }
  };

  const modalSliderSettings = {
    dots: allImages.length > 1,
    dotsClass: 'slick-dots slick-thumb',
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    initialSlide: activeSlide,
    adaptiveHeight: true,
    lazyLoad: 'ondemand',
    fade: false,
    swipe: true,
    beforeChange: () => setIsImageLoading(true),
    afterChange: () => setIsImageLoading(false),
    customPaging: function (i: number) {
      return (
        <div className="thumbnail-wrapper">
          <Image
            src={allImages[i]?.url}
            alt={`Thumbnail ${i + 1}`}
            width={thumbnailSize.width}
            height={thumbnailSize.height}
            objectFit="contain"
          />
        </div>
      );
    }
  };

  const openModal = (index: number) => {
    setActiveSlide(index);
    setIsModalOpen(true);

    setTimeout(() => {
      if (modalSliderRef.current) {
        modalSliderRef.current.slickGoTo(index);
      }
    }, 100);

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = '';
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowRight' && modalSliderRef.current) {
      modalSliderRef.current.slickNext();
    } else if (e.key === 'ArrowLeft' && modalSliderRef.current) {
      modalSliderRef.current.slickPrev();
    }
  };

  return (
    <div className="product-media-container">
      <div className="main-image-container">
        {allImages.length > 0 && (
          <SliderComponent.default
            ref={mainSliderRef}
            {...mainSliderSettings}
            className="product-slider"
          >
            {allImages.map((image, index) => (
              <div
                key={index}
                className="product-image"
                onClick={() => openModal(index)}
                style={{ width: imageSize.width, height: imageSize.height }}
              >
                <Image
                  src={image.url}
                  alt={image.alt || 'Product image'}
                  width={imageSize.width}
                  height={imageSize.height}
                  objectFit="scale-down"
                />
              </div>
            ))}
          </SliderComponent.default>
        )}
        {allImages.length === 0 && (
          <div className="w-full h-full flex items-center justify-center py-24 bg-gray-100">
            <ProductNoThumbnail className="w-48 h-48" />
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="product-image-modal">
          <div className="modal-overlay" onClick={closeModal}></div>
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={closeModal}
              aria-label="Close fullscreen view"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="modal-slider-container">
              {isImageLoading && (
                <div className="loading-indicator">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="spinner"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 2a10 10 0 1 0 10 10"></path>
                  </svg>
                </div>
              )}
              <SliderComponent.default
                ref={modalSliderRef}
                {...modalSliderSettings}
              >
                {allImages.map((image, index) => (
                  <div key={index} className="modal-image">
                    <Image
                      src={image.url}
                      alt={image.alt || 'Product image'}
                      width={fullscreenWidth}
                      height={fullscreenHeight}
                      objectFit="contain"
                    />
                  </div>
                ))}
              </SliderComponent.default>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
