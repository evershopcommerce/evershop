import React, { useRef, useState } from 'react';
import { get } from '../../../../../../lib/util/get';
import { useAppState } from '../../../../../../lib/context/app';
import { Card } from '../../../../../cms/views/admin/Card';
import Button from '../../../../../../lib/components/form/Button';

export default function Image() {
  const context = useAppState();
  const [image, setImage] = useState(get(context, 'category.image', undefined));
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  const onChange = (e) => {
    e.persist();
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) { formData.append('images', e.target.files[i]); }
    setLoading(true);
    fetch(
      `${get(context, 'imageUploadUrl')}/` + `catalog/${Math.floor(Math.random() * (9999 - 1000)) + 1000}/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`,
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
        if (get(response, 'success') === true) { setImage(response.data.files[0]); } else {
          // toast.error(get(response, "message", "Failed!"));
        }
      })
      .catch(
        (error) => {
          // toast.error(get(error, "message", "Failed!"));
        }
      )
      .finally(() => {
        e.target.value = null;
        setLoading(false);
      });
  };

  return (
    <Card title="Category banner" actions={image ? [{ name: 'Change', onAction: () => ref.current.click() }, { name: 'Remove', variant: 'critical', onAction: () => setImage(undefined) }] : []}>
      <Card.Session>
        {!image && (
          <label htmlFor="categoryImageUpload" className="flex flex-col justify-center image-uploader">
            {loading === true && (
              <div className="loading flex justify-center">
                <div className="self-center">
                  <svg style={{ display: 'block', shapeRendering: 'auto' }} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
                    <circle cx="50" cy="50" fill="none" stroke="var(--primary)" strokeWidth="10" r="43" strokeDasharray="202.63272615654165 69.54424205218055">
                      <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1" />
                    </circle>
                  </svg>
                </div>
              </div>
            )}
            <div className="uploader-icon flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex justify-center">
              <Button title="Add image" variant="default" onAction={() => ref.current.click()} />
            </div>
            <div className="flex justify-center mt-1"><span style={{ color: '#6d7175', fontSize: '1.2rem' }}>click to upload an image</span></div>
          </label>
        )}
        {image && (
          <div className="category-image">
            <img src={image.url} />
          </div>
        )}
        {image && <input type="hidden" value={image.path} name="image" />}
        {!image && <input type="hidden" value="" name="image" />}
        <div className="invisible" style={{ width: '1px', height: '1px' }}>
          <input id="categoryImageUpload" type="file" onChange={onChange} ref={ref} />
        </div>
      </Card.Session>
    </Card>
  );
}
