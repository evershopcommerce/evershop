/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import { FileBrowser } from '@components/admin/FileBrowser.js';
import { InputField } from '@components/common/form/InputField.js';
import React, { useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';

interface SlideData {
  id: string;
  image: string;
  width?: number; // Image natural width (automatically detected)
  height?: number; // Image natural height (automatically detected)
  headline: string;
  subText: string;
  buttonText: string;
  buttonLink: string;
  buttonColor: string;
}

interface SlideshowSettingProps {
  slideshowWidget?: {
    slides?: SlideData[];
    autoplay?: boolean;
    autoplaySpeed?: number;
    arrows?: boolean;
    dots?: boolean;
    fullWidth?: boolean;
    widthValue?: number;
    heightValue?: number;
    heightType?: 'auto' | 'fixed' | 'full';
  };
}

export default function SlideshowSetting({
  slideshowWidget
}: SlideshowSettingProps) {
  const {
    slides = [],
    autoplay = true,
    autoplaySpeed = 3000,
    arrows = true,
    dots = true,
    fullWidth = true,
    widthValue = 1920,
    heightValue = 800,
    heightType = 'auto'
  } = slideshowWidget || {};

  const { control, setValue, watch } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'settings.slides'
  });

  const currentSlides = watch('settings.slides', slides);
  const currentAutoplay = watch('settings.autoplay', autoplay);
  const currentAutoplaySpeed = watch('settings.autoplaySpeed', autoplaySpeed);
  const currentArrows = watch('settings.arrows', arrows);
  const currentDots = watch('settings.dots', dots);
  const currentFullWidth = watch('settings.fullWidth', fullWidth);

  useEffect(() => {
    // Initialize slides with existing data
    setValue('settings.slides', currentSlides?.length ? currentSlides : []);

    // Initialize the autoplay settings
    const handleAutoplay =
      currentAutoplay === undefined || currentAutoplay === null
        ? autoplay
        : Boolean(currentAutoplay);
    setValue('settings.autoplay', handleAutoplay);

    // Initialize the autoplay speed
    const speed = Number(currentAutoplaySpeed) || Number(autoplaySpeed) || 3000;
    setValue('settings.autoplaySpeed', speed);

    // Initialize the arrows setting
    const handleArrows =
      currentArrows === undefined || currentArrows === null
        ? arrows
        : Boolean(currentArrows);
    setValue('settings.arrows', handleArrows);

    // Initialize the dots setting
    const handleDots =
      currentDots === undefined || currentDots === null
        ? dots
        : Boolean(currentDots);
    setValue('settings.dots', handleDots);

    // Initialize the fullWidth setting
    const handleFullWidth =
      currentFullWidth === undefined || currentFullWidth === null
        ? fullWidth
        : Boolean(currentFullWidth);
    setValue('settings.fullWidth', handleFullWidth);

    // Always use adaptive height for the slideshow
    setValue('settings.heightType', 'auto');

    // Process all slides to detect image dimensions if they don't have them yet
    if (currentSlides?.length) {
      currentSlides.forEach((slide, index) => {
        if (slide.image && (!slide.width || !slide.height)) {
          getImageDimensions(slide.image, index);
        }
      });
    }
  }, []);

  const [activeSlideIndex, setActiveSlideIndex] = React.useState<number | null>(
    null
  );
  const [openFileBrowser, setOpenFileBrowser] = React.useState(false);

  // Function to get image dimensions
  const getImageDimensions = (imageUrl: string, slideIndex: number) => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      // Update the current slides with the new dimensions
      const newSlides = [...currentSlides];
      newSlides[slideIndex] = {
        ...newSlides[slideIndex],
        width,
        height
      };
      setValue('settings.slides', newSlides);
    };
    img.src = imageUrl;
  };

  const handleImageSelect = (image: string) => {
    if (activeSlideIndex !== null) {
      setValue(`settings.slides.${activeSlideIndex}.image`, image);

      // Detect image dimensions when a new image is selected
      getImageDimensions(image, activeSlideIndex);
      setOpenFileBrowser(false);
    }
  };

  const addSlide = () => {
    const newSlide: SlideData = {
      id: uuidv4(),
      image: '',
      width: 0, // Will be automatically set when image is selected
      height: 0, // Will be automatically set when image is selected
      headline: '',
      subText: '',
      buttonText: '',
      buttonLink: '',
      buttonColor: '#3B82F6' // Default blue color
    };
    append(newSlide);

    setTimeout(() => {
      setActiveSlideIndex(fields.length);
    }, 50);
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
      setActiveSlideIndex(index - 1);
    }
  };

  const moveDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1);
      setActiveSlideIndex(index + 1);
    }
  };

  return (
    <div className="slideshow-widget">
      {openFileBrowser && (
        <div className="max-h-96">
          <FileBrowser
            isMultiple={false}
            onInsert={handleImageSelect}
            close={() => setOpenFileBrowser(false)}
          />
        </div>
      )}

      <div className="bg-white p-4 rounded shadow-sm mb-4">
        <h2 className="text-lg font-medium mb-4">Slideshow Settings</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="autoplay"
                checked={Boolean(currentAutoplay)}
                onChange={(e) => {
                  const isChecked = Boolean(e.target.checked);
                  setValue('settings.autoplay', isChecked);
                }}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="autoplay" className="text-sm">
                Autoplay Slides
              </label>
            </div>

            {Boolean(currentAutoplay) && (
              <InputField
                type="number"
                label="Autoplay Speed (ms)"
                name="settings.autoplaySpeed"
                defaultValue={Number(autoplaySpeed) || 3000}
                placeholder="e.g., 3000 for 3 seconds"
                validation={{
                  min: { value: 1000, message: 'Minimum speed is 1000ms' }
                }}
              />
            )}
          </div>

          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="arrows"
                checked={Boolean(currentArrows)}
                onChange={(e) => {
                  const isChecked = Boolean(e.target.checked);
                  setValue('settings.arrows', isChecked);
                }}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="arrows" className="text-sm">
                Show Navigation Arrows
              </label>
            </div>
            {/* <div className="flex items-center">
              <input
                type="checkbox"
                id="dots"
                checked={Boolean(currentDots)}
                onChange={(e) => {
                  const isChecked = Boolean(e.target.checked);
                  setValue('settings.dots', isChecked);
                }}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="dots" className="text-sm">
                Show Navigation Dots
              </label>
            </div> */}
          </div>
        </div>
      </div>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-medium">Slides</h2>
          <button
            type="button"
            onClick={addSlide}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Add New Slide
          </button>
        </div>

        {fields.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {fields.map((slide, index) => (
              <div
                key={slide.id}
                onClick={() => setActiveSlideIndex(index)}
                className={`relative border rounded overflow-hidden cursor-pointer ${
                  activeSlideIndex === index ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center">
                  {currentSlides[index]?.image ? (
                    <img
                      src={currentSlides[index].image}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400">No Image</div>
                  )}
                </div>
                <div className="p-2 bg-white border-t">
                  <p className="text-sm font-medium truncate">
                    {currentSlides[index]?.headline || `Slide ${index + 1}`}
                  </p>
                  <div className="flex mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveUp(index);
                      }}
                      disabled={index === 0}
                      className={`mr-1 p-1 rounded ${
                        index === 0
                          ? 'text-gray-300'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveDown(index);
                      }}
                      disabled={index === fields.length - 1}
                      className={`mr-1 p-1 rounded ${
                        index === fields.length - 1
                          ? 'text-gray-300'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(index);
                        if (activeSlideIndex === index) {
                          setActiveSlideIndex(null);
                        } else if (
                          activeSlideIndex !== null &&
                          activeSlideIndex > index
                        ) {
                          setActiveSlideIndex(activeSlideIndex - 1);
                        }
                      }}
                      className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <p className="text-gray-500 mb-4">No slides have been added yet.</p>
            <button
              type="button"
              onClick={addSlide}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Add Your First Slide
            </button>
          </div>
        )}
      </div>

      {activeSlideIndex !== null && fields[activeSlideIndex] && (
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-lg font-medium mb-4">
            Edit Slide {activeSlideIndex + 1}
          </h3>

          <div className="mb-4 border rounded overflow-hidden">
            <div className="aspect-[16/9] bg-gray-100 relative">
              {currentSlides[activeSlideIndex]?.image ? (
                <div className="relative w-full h-full">
                  <img
                    src={currentSlides[activeSlideIndex].image}
                    alt={`Slide ${activeSlideIndex + 1}`}
                    className="w-full h-full object-cover"
                    onLoad={(e) => {
                      // Additional dimensions detection when the preview image loads
                      const img = e.target as HTMLImageElement;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        if (
                          !currentSlides[activeSlideIndex]?.width ||
                          !currentSlides[activeSlideIndex]?.height
                        ) {
                          const newSlides = [...currentSlides];
                          newSlides[activeSlideIndex] = {
                            ...newSlides[activeSlideIndex],
                            width: img.naturalWidth,
                            height: img.naturalHeight
                          };
                          setValue('settings.slides', newSlides);
                        }
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex flex-col items-center justify-center p-4 text-center">
                    {currentSlides[activeSlideIndex]?.headline && (
                      <h3 className="text-white text-xl md:text-2xl font-bold mb-2">
                        {currentSlides[activeSlideIndex].headline}
                      </h3>
                    )}
                    {currentSlides[activeSlideIndex]?.subText && (
                      <p className="text-white mb-4">
                        {currentSlides[activeSlideIndex].subText}
                      </p>
                    )}
                    {currentSlides[activeSlideIndex]?.buttonText && (
                      <button
                        type="button"
                        className="px-4 py-2 rounded"
                        style={{
                          backgroundColor:
                            currentSlides[activeSlideIndex].buttonColor ||
                            '#3B82F6'
                        }}
                      >
                        {currentSlides[activeSlideIndex].buttonText}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setOpenFileBrowser(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Select Image
                  </button>
                </div>
              )}

              {currentSlides[activeSlideIndex]?.image && (
                <button
                  type="button"
                  onClick={() => setOpenFileBrowser(true)}
                  className="absolute bottom-2 right-2 bg-white p-2 rounded shadow hover:bg-gray-100"
                >
                  Change Image
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="hidden"
              name={`settings.slides.${activeSlideIndex}.image`}
              value={
                (currentSlides && currentSlides[activeSlideIndex]?.image) || ''
              }
            />

            <input
              type="hidden"
              name={`settings.slides.${activeSlideIndex}.id`}
              value={
                (currentSlides && currentSlides[activeSlideIndex]?.id) ||
                uuidv4()
              }
            />

            {/* Hidden fields for image dimensions */}
            <input
              type="hidden"
              name={`settings.slides.${activeSlideIndex}.width`}
              value={currentSlides[activeSlideIndex]?.width || 0}
            />

            <input
              type="hidden"
              name={`settings.slides.${activeSlideIndex}.height`}
              value={currentSlides[activeSlideIndex]?.height || 0}
            />

            {/* Display image dimensions if available */}
            {currentSlides[activeSlideIndex]?.image && (
              <div className="md:col-span-2 mb-2">
                <div className="text-sm text-gray-500">
                  {currentSlides[activeSlideIndex]?.width &&
                  currentSlides[activeSlideIndex]?.height ? (
                    <p>
                      Image dimensions: {currentSlides[activeSlideIndex].width}{' '}
                      × {currentSlides[activeSlideIndex].height} pixels
                    </p>
                  ) : (
                    <p>Detecting image dimensions...</p>
                  )}
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block mb-1 text-sm">Headline</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                name={`settings.slides.${activeSlideIndex}.headline`}
                value={currentSlides[activeSlideIndex]?.headline || ''}
                onChange={(e) => {
                  const newSlides = [...currentSlides];
                  newSlides[activeSlideIndex] = {
                    ...newSlides[activeSlideIndex],
                    headline: e.target.value
                  };
                  setValue('settings.slides', newSlides);
                }}
                placeholder="e.g., New Collection Available"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 text-sm">Sub Text</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded"
                name={`settings.slides.${activeSlideIndex}.subText`}
                value={currentSlides[activeSlideIndex]?.subText || ''}
                onChange={(e) => {
                  const newSlides = [...currentSlides];
                  newSlides[activeSlideIndex] = {
                    ...newSlides[activeSlideIndex],
                    subText: e.target.value
                  };
                  setValue('settings.slides', newSlides);
                }}
                placeholder="e.g., Check out our latest products with special discounts"
                rows={3}
              ></textarea>
            </div>

            <div>
              <label className="block mb-1 text-sm">Button Text</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                name={`settings.slides.${activeSlideIndex}.buttonText`}
                value={currentSlides[activeSlideIndex]?.buttonText || ''}
                onChange={(e) => {
                  const newSlides = [...currentSlides];
                  newSlides[activeSlideIndex] = {
                    ...newSlides[activeSlideIndex],
                    buttonText: e.target.value
                  };
                  setValue('settings.slides', newSlides);
                }}
                placeholder="e.g., Shop Now"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm">Button Link</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                name={`settings.slides.${activeSlideIndex}.buttonLink`}
                value={currentSlides[activeSlideIndex]?.buttonLink || ''}
                onChange={(e) => {
                  const newSlides = [...currentSlides];
                  newSlides[activeSlideIndex] = {
                    ...newSlides[activeSlideIndex],
                    buttonLink: e.target.value
                  };
                  setValue('settings.slides', newSlides);
                }}
                placeholder="e.g., /category/new-arrivals"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm">Button Color</label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={
                    currentSlides[activeSlideIndex]?.buttonColor || '#3B82F6'
                  }
                  onChange={(e) => {
                    const newSlides = [...currentSlides];
                    newSlides[activeSlideIndex] = {
                      ...newSlides[activeSlideIndex],
                      buttonColor: e.target.value
                    };
                    setValue('settings.slides', newSlides);
                  }}
                  className="w-10 h-10 rounded mr-2 cursor-pointer"
                />
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={
                    currentSlides[activeSlideIndex]?.buttonColor || '#3B82F6'
                  }
                  onChange={(e) => {
                    const newSlides = [...currentSlides];
                    newSlides[activeSlideIndex] = {
                      ...newSlides[activeSlideIndex],
                      buttonColor: e.target.value
                    };
                    setValue('settings.slides', newSlides);
                  }}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </div>
        </div>
      )}
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
      dots: $dots,
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
  dots: getWidgetSetting("dots"),
}`;
