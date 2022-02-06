import React from 'react';
import uniqid from 'uniqid';
import { get } from '../../../../../../lib/util/get';
import { useAppState } from '../../../../../../lib/context/app';

function Upload({ addImage }) {
  const context = useAppState();
  const onChange = (e) => {
    e.persist();
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) { formData.append('images', e.target.files[i]); }

    formData.append('targetPath', `catalog/${Math.floor(Math.random() * (9999 - 1000)) + 1000}/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`);

    fetch(
      `${get(context, 'productImageUploadUrl')}/` + `catalog/${Math.floor(Math.random() * (9999 - 1000)) + 1000}/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    ).then((response) => {
      if (!response.headers.get('content-type') || !response.headers.get('content-type').includes('application/json')) { throw new TypeError('Something wrong. Please try again'); }

      return response.json();
    })
      .then((response) => {
        if (get(response, 'success') === true) {
          addImage(get(response, 'data.files', []).map((i) => ({
            id: uniqid(),
            url: i.url,
            path: i.path
          })));
        } else {
          // toast.error(get(response, "message", "Failed!"));
        }
      })
      .catch(
        (error) => {
          // toast.error(get(error, "message", "Failed!"));
        }
      )
      .finally(() => e.target.value = null);
  };

  const id = uniqid();
  return (
    <div className="uploader grid-item">
      <div className="uploader-icon">
        <label htmlFor={id}>
          <svg style={{ width: '30px', height: '30px' }} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </label>
      </div>
      <div className="invisible">
        <input id={id} type="file" multiple onChange={onChange} />
      </div>
    </div>
  );
}

function Image({ image, removeImage }) {
  return (
    <div className="image grid-item" id={image.id}>
      <div className="img"><img src={image.url} /></div>
      <span className="remove cursor-pointer text-critical fill-current" onClick={() => removeImage(image.id)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-trash-2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </span>
      {/* <span className="zoom btn btn-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-maximize-2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        </span> */}
    </div>
  );
}

function Images({
  id, images, addImage, removeImage
}) {
  return (
    <div id={id} className="image-list">
      {images.map((image) => <Image key={image.id} removeImage={removeImage} image={image} />)}
      <Upload addImage={addImage} />
    </div>
  );
}

export default function ProductMediaManager({ productImages, id }) {
  const [images, setImages] = React.useState(productImages);
  const [draggable, setDragable] = React.useState(null);
  React.useEffect(() => {
    if (draggable) { draggable.destroy(); }

    const swappable = new Swappable.default(document.querySelectorAll(`div#${id}`), {
      draggable: 'div.image',
      handle: 'div.image img'
    });
    let source = null;
    let destination = null;
    swappable.on('swappable:swapped', (event) => {
      source = event.data.dragEvent.data.source.id;
      destination = event.data.dragEvent.data.over.id;
    });

    swappable.on('swappable:stop', (event) => {
      if (!source || !destination) { return; }
      setImages((images) => {
        const newImages = Array.from(images);
        const sr = images.find((image) => image.id === source);
        newImages[images.findIndex((image) => image.id === source)] = images.find((image) => image.id === destination);
        newImages[images.findIndex((image) => image.id === destination)] = sr;
        return newImages;
      });
    });
    setDragable(swappable);
  }, [images]);

  const addImage = (imageArray) => {
    if (draggable) { draggable.destroy(); }
    setImages(images.concat(imageArray));
  };

  const removeImage = (id) => {
    if (draggable) { draggable.destroy(); }
    setImages(images.filter((i) => i.id !== id));
  };

  return (
    <div className="product-image-manager">
      <Images id={id} images={images} addImage={addImage} removeImage={removeImage} />
      {images.map((image, index) => <input key={index} type="hidden" name={`${id}[]`} value={image.path} />)}
    </div>
  );
}
