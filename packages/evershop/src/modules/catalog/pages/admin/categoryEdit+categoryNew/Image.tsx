import React, { useEffect, useState } from 'react';
import './Image.scss';
import { Image, ImageUploader } from '@components/admin/ImageUploader.js';
import { InputField } from '@components/common/form/InputField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { useFormContext } from 'react-hook-form';

interface ImageProps {
  category?: {
    image?: Image;
  };
}

export default function Image({ category }: ImageProps) {
  const [image, setImage] = useState(category?.image);
  const { setValue } = useFormContext();

  useEffect(() => {
    if (image) {
      setValue('image', image.url);
    } else {
      setValue('image', '');
    }
  }, [image, setValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Category Image')}</CardTitle>
        <CardDescription>
          {_('Upload an image for the category.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ImageUploader
          onUpload={(images) => {
            if (images.length > 0) {
              setImage(images[0]);
            }
          }}
          isMultiple={false}
          allowDelete={true}
          onDelete={() => {
            setImage(undefined);
          }}
          currentImages={image ? [image] : []}
          targetPath={`catalog/${
            Math.floor(Math.random() * (9999 - 1000)) + 1000
          }/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`}
        />
        <InputField type="hidden" value={image?.url} name="image" />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      image {
        id: uuid
        url
      }
    }
  }
`;
