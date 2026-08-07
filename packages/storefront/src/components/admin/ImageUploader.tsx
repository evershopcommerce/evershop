import React from 'react';
import { toast } from 'react-toastify';
import uniqid from 'uniqid';
import { useQuery } from 'urql';
import { get } from '../../lib/util/get.js';
import './ImageUploader.scss';
import Spinner from '@components/admin/Spinner.js';
import { ImageUploaderSkeleton } from './ImageUploaderSkeleton.js';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Image {
  uuid: string;
  url: string;
  path?: string;
}

const Upload: React.FC<{
  imageUploadUrl: string;
  targetPath?: string;
  onUpload: (images: Image[]) => void | Promise<void>;
  isSingleMode?: boolean;
}> = ({ imageUploadUrl, targetPath, onUpload, isSingleMode }) => {
  const [uploading, setUploading] = React.useState(false);

  const onChange = (e) => {
    setUploading(true);
    e.persist();
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i += 1) {
      formData.append('images', e.target.files[i]);
    }
    formData.append('targetPath', targetPath || '');
    fetch(imageUploadUrl + (targetPath || ''), {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then((response) => {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new TypeError('Something wrong. Please try again');
        }

        return response.json();
      })
      .then(async (response) => {
        if (!response.error) {
          await onUpload(
            get(response, 'data.files', []).map((i) => ({
              uuid: uniqid(),
              url: i.url,
              path: i.path
            }))
          );
        } else {
          toast.error(get(response, 'error.message', 'Failed!'));
        }
      })
      .catch((error) => {
        toast.error(error.message);
      })
      .finally(() => {
        e.target.value = null;
        setUploading(false);
      });
  };

  const id = uniqid();
  return (
    <div className="uploader grid-item">
      <div className="uploader-icon">
        <label htmlFor={id}>
          {uploading ? (
            <Spinner
              width={isSingleMode ? 40 : 25}
              height={isSingleMode ? 40 : 25}
            />
          ) : (
            <svg
              style={{
                width: isSingleMode ? '30px' : '30px',
                height: isSingleMode ? '30px' : '30px'
              }}
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </label>
      </div>
      <div className="invisible">
        <input id={id} type="file" multiple onChange={onChange} />
      </div>
    </div>
  );
};

const Image: React.FC<{
  image: Image;
  allowDelete?: boolean;
  onDelete: (image) => void | Promise<void>;
  isFirst?: boolean;
  isSingleMode?: boolean;
}> = ({ image, allowDelete, onDelete, isFirst, isSingleMode }) => {
  const [deleting, setDeleting] = React.useState(false);
  // Use ref to track if component is mounted
  const isMounted = React.useRef(true);

  // Set up effect for cleanup
  React.useEffect(() => {
    return () => {
      // When component unmounts, set ref to false
      isMounted.current = false;
    };
  }, []);

  // Assign classes based on mode
  const classes = isSingleMode
    ? 'image'
    : `image grid-item ${isFirst ? 'first-item' : ''}`;

  return (
    <div className={classes} id={image.uuid}>
      <div className="img">
        <img src={image.url} alt="" />
      </div>
      {allowDelete && (
        <span
          role="button"
          tabIndex={0}
          className={`remove cursor-pointer text-critical fill-current ${
            isSingleMode ? 'single-mode-remove' : ''
          }`}
          onClick={async () => {
            setDeleting(true);
            await onDelete(image);
            // Only update state if component is still mounted
            if (isMounted.current) {
              setDeleting(false);
            }
          }}
          onKeyDown={() => {}}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={isSingleMode ? '20' : '16'}
            height={isSingleMode ? '20' : '16'}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="feather feather-trash-2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </span>
      )}
      {deleting && (
        <div className="remove">
          <Spinner width={15} height={15} />
        </div>
      )}
    </div>
  );
};

const SortableImage: React.FC<{
  image: Image;
  allowDelete?: boolean;
  onDelete: (image) => void | Promise<void>;
  isFirst?: boolean;
}> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: props.image.uuid
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid-item ${props.isFirst ? 'first-item' : ''}`}
      {...attributes}
      {...listeners}
    >
      <Image {...props} />
    </div>
  );
};

const GetUploadApiQuery = `
  query Query ($filters: [FilterInput!]) {
    imageUploadUrl: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
  }
`;

export interface ImageUploaderProps {
  currentImages?: Array<Image>;
  isMultiple?: boolean;
  allowDelete?: boolean;
  onDelete?: (image: Image) => void | Promise<void>;
  onUpload?: (images: Image[]) => void | Promise<void>;
  targetPath?: string;
  allowSwap?: boolean;
  onSortEnd?: (oldIndex: number, newIndex: number) => void;
}
interface ImagesProps extends ImageUploaderProps {
  addImage: (imageArray: Image[]) => void;
  imageUploadUrl: string;
  onDelete: (image: Image) => void | Promise<void>;
  onUpload: (images: Image[]) => void | Promise<void>;
  targetPath?: string;
  onSortEnd?: (oldIndex: number, newIndex: number) => void;
}
const Images: React.FC<ImagesProps> = ({
  allowDelete = true,
  currentImages,
  imageUploadUrl,
  onDelete,
  onUpload,
  targetPath,
  isMultiple,
  allowSwap,
  onSortEnd
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && onSortEnd && currentImages) {
      const oldIndex = currentImages.findIndex((img) => img.uuid === active.id);
      const newIndex = currentImages.findIndex((img) => img.uuid === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onSortEnd(oldIndex, newIndex);
      }
    }
  };

  if (!isMultiple) {
    const hasImage = currentImages && currentImages.length > 0;

    return (
      <div className={`single-image-container ${!hasImage ? 'no-image' : ''}`}>
        {hasImage ? (
          <Image
            key={currentImages[0].uuid}
            image={currentImages[0]}
            onDelete={onDelete}
            allowDelete={allowDelete}
            isSingleMode={true}
          />
        ) : null}
        <Upload
          imageUploadUrl={imageUploadUrl}
          targetPath={targetPath}
          onUpload={onUpload}
          isSingleMode={true}
        />
      </div>
    );
  } else if (allowSwap && currentImages && currentImages.length > 1) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={currentImages.map((img) => img.uuid)}>
          {currentImages.map((image, index) => (
            <SortableImage
              key={image.uuid}
              image={image}
              onDelete={onDelete}
              allowDelete={allowDelete}
              isFirst={index === 0}
            />
          ))}
        </SortableContext>
        <Upload
          imageUploadUrl={imageUploadUrl}
          targetPath={targetPath}
          onUpload={onUpload}
        />
      </DndContext>
    );
  }

  // Multi-image mode without drag and drop
  return (
    <>
      {(currentImages || []).map((image, index) => (
        <Image
          key={image.uuid}
          image={image}
          onDelete={onDelete}
          allowDelete={allowDelete}
          isFirst={index === 0}
        />
      ))}
      <Upload
        imageUploadUrl={imageUploadUrl}
        targetPath={targetPath}
        onUpload={onUpload}
      />
    </>
  );
};

export function ImageUploader({
  currentImages = [],
  isMultiple = true,
  allowDelete = true,
  onDelete,
  onUpload,
  allowSwap = true,
  targetPath,
  onSortEnd
}: ImageUploaderProps) {
  const [images, setImages] = React.useState<Image[]>(
    currentImages.map((image) => ({
      uuid: image.uuid,
      url: image.url,
      path: image.path
    }))
  );

  const handleSortEnd = (oldIndex: number, newIndex: number) => {
    setImages((items) => {
      return arrayMove(items, oldIndex, newIndex);
    });
    if (onSortEnd) {
      onSortEnd(oldIndex, newIndex);
    }
  };

  const addImage = (imageArray: Image[]) => {
    if (!isMultiple) {
      // For single image mode, replace the current image
      setImages(imageArray);
    } else {
      setImages(images.concat(imageArray));
    }
  };

  const removeImage = (imageUuid) => {
    setImages(images.filter((i) => i.uuid !== imageUuid));
  };

  const onDeleteFn = async (image: Image) => {
    if (onDelete) {
      await onDelete(image);
    }
    removeImage(image.uuid);
  };

  const onUploadFn = async (imageArray: Image[]) => {
    if (onUpload) {
      await onUpload(imageArray);
    }
    addImage(imageArray);
  };

  const [result] = useQuery({
    query: GetUploadApiQuery
  });
  const { data, fetching, error } = result;

  if (error) {
    return <p className="text-critical">There was an error:{error.message}</p>;
  } else if (fetching) {
    return <ImageUploaderSkeleton itemCount={isMultiple ? 5 : 1} />;
  } else {
    return (
      <div className="image-uploader-manager">
        <div
          id={'image-uploader-wrapper'}
          className={isMultiple ? 'image-list' : ''}
        >
          <Images
            currentImages={images}
            addImage={addImage}
            imageUploadUrl={data.imageUploadUrl}
            targetPath={targetPath}
            onDelete={onDeleteFn}
            onUpload={onUploadFn}
            allowDelete={allowDelete}
            allowSwap={allowSwap && isMultiple}
            onSortEnd={handleSortEnd}
            isMultiple={isMultiple}
          />
        </div>
      </div>
    );
  }
}
