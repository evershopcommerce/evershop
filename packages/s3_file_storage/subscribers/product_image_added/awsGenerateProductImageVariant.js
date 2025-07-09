const path = require('path');
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand
} = require('@aws-sdk/client-s3');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');
const sharp = require('sharp');
const { update } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { error } = require('@evershop/evershop/src/lib/log/logger');

async function downloadObject(s3Client, objectUrl) {

  const parsedUrl = new URL(objectUrl);
  let bucketName; let objectKey;

  if (parsedUrl.host.startsWith("s3")) {
    // Generic S3 URL format: s3.<region>.amazonaws.com/<bucket-name>/<object-key>
    const pathParts = parsedUrl.pathname.split('/');
    [,bucketName] = pathParts;  // Extract bucket name
    objectKey = pathParts.slice(2).join('/'); // Extract object key
  } else {
    // Bucket URL format: <bucket-name>.s3.amazonaws.com/<object-key>
    [bucketName] = parsedUrl.host.split('.'); // Extract bucket name
    objectKey = parsedUrl.pathname.substr(1); // Extract object key (remove leading '/')
  }

  if (!bucketName || !objectKey) {
    throw new Error(`Failed to extract bucket name or object key from URL: ${objectUrl}`);
  }


  const params = {
    Bucket: bucketName,
    Key: objectKey
  };

  const getObjectCommand = new GetObjectCommand(params);
  const data = await s3Client.send(getObjectCommand);

  return data;
}

async function objectToBuffer(data) {
  // Get content as a buffer from the data.Body object
  const buffer = await data.Body.transformToByteArray();
  return buffer;
}

async function resizeAndUploadImage(
  s3Client,
  originalImageBuffer,
  resizedObjectUrl,
  width,
  height,
  contentType
) {
  const bucketName = getEnv('AWS_BUCKET_NAME');
  // Resize the image
  const resizedImageBuffer = await sharp(originalImageBuffer)
    .resize({ width, height, fit: 'inside' })
    .toBuffer();

  // Upload the resized image
  const parsedUrl = new URL(resizedObjectUrl);
  let objectKey; // Extract the object key (remove leading '/')

  if (parsedUrl.host.startsWith("s3")) {
    // Generic S3 URL: s3.<region>.amazonaws.com/<bucket-name>/<object-key>
    const pathParts = parsedUrl.pathname.split('/');
    objectKey = pathParts.slice(2).join('/'); // Extract only the object key
  } else {
    // Standard Bucket URL: <bucket-name>.s3.amazonaws.com/<object-key>
    objectKey = parsedUrl.pathname.substr(1);
  }

  const uploadParams = {
    Bucket: bucketName,
    Key: objectKey,
    Body: resizedImageBuffer,
    ACL: 'public-read',
    ContentType: contentType
  };

  const uploadCommand = new PutObjectCommand(uploadParams);
  await s3Client.send(uploadCommand);
  return resizedObjectUrl;
}

module.exports = async function awsGenerateProductImageVariant(data) {
  if (getConfig('system.file_storage') === 's3') {
    try {
      const s3Client = new S3Client({ region: getEnv('AWS_REGION') });
      const originalObjectUrl = data.origin_image;
      // The data.image is the full url of the Object, we need to get the Object path
      // by removing the container url
      const ext = path.extname(originalObjectUrl);
      // Target path for single variant by adding a '-single' just before the extension
      const singleObjectUrl = originalObjectUrl.replace(ext, `-single${ext}`);
      // Target path for listing variant by adding a '-listing' just before the extension
      const listingObjectUrl = originalObjectUrl.replace(ext, `-listing${ext}`);
      // Target path for thumbnail variant by adding a '-thumbnail' just before the extension
      const thumbnailObjectUrl = originalObjectUrl.replace(
        ext,
        `-thumbnail${ext}`
      );

      const s3ObjectData = await downloadObject(s3Client, originalObjectUrl);
      const originalImageBuffer = await objectToBuffer(s3ObjectData);
      const contentType = s3ObjectData.ContentType || 'application/octet-stream';

      // Upload the single variant
      const singleUrl = await resizeAndUploadImage(
        s3Client,
        originalImageBuffer,
        singleObjectUrl,
        getConfig('catalog.product.image.single.width', 500),
        getConfig('catalog.product.image.single.height', 500),
        contentType
      );

      // Upload the listing variant
      const listingUrl = await resizeAndUploadImage(
        s3Client,
        originalImageBuffer,
        listingObjectUrl,
        getConfig('catalog.product.image.listing.width', 250),
        getConfig('catalog.product.image.listing.height', 250),
        contentType
      );

      // Upload the thumbnail variant
      const thumbnailUrl = await resizeAndUploadImage(
        s3Client,
        originalImageBuffer,
        thumbnailObjectUrl,
        getConfig('catalog.product.image.thumbnail.width', 100),
        getConfig('catalog.product.image.thumbnail.height', 100),
        contentType
      );

      // Update the record in the database with the new URLs in the variant columns
      await update('product_image')
        .given({
          single_image: singleUrl,
          listing_image: listingUrl,
          thumb_image: thumbnailUrl
        })
        .where('product_image_product_id', '=', data.product_image_product_id)
        .and('origin_image', '=', data.origin_image)
        .execute(pool);
    } catch (e) {
      error(e);
    }
  }
};
