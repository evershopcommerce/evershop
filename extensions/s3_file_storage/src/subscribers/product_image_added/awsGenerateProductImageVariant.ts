import path from "path";
import sharp from "sharp";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { getConfig } from "@evershop/evershop/lib/util/getConfig";
import { update } from "@evershop/postgres-query-builder";
import { pool } from "@evershop/evershop/lib/postgres";
import { error } from "@evershop/evershop/lib/log";

async function downloadObjectToBuffer(objectUrl: string) {
  const parsedUrl = new URL(objectUrl);
  const bucketName = parsedUrl.host.split(".")[0]; // Extract the bucket name
  const objectKey = parsedUrl.pathname.substr(1); // Extract the object key (remove leading '/')

  const params = {
    Bucket: bucketName,
    Key: objectKey,
  };

  const getObjectCommand = new GetObjectCommand(params);
  const s3Client = new S3Client({ region: getEnv("AWS_REGION") });
  const data = await s3Client.send(getObjectCommand);
  // Get content as a buffer from the data.Body object
  const buffer = await data.Body?.transformToByteArray();
  return buffer;
}

async function resizeAndUploadImage(
  s3Client: S3Client,
  originalObjectUrl: string,
  resizedObjectUrl: string,
  width: number,
  height: number
) {
  const bucketName = getEnv("AWS_BUCKET_NAME");
  const originalImageBuffer = await downloadObjectToBuffer(originalObjectUrl);
  // Resize the image
  const resizedImageBuffer = await sharp(originalImageBuffer)
    .resize({ width, height, fit: "inside" })
    .toBuffer();

  // Upload the resized image
  const parsedUrl = new URL(resizedObjectUrl);
  const objectKey = parsedUrl.pathname.substr(1); // Extract the object key (remove leading '/')

  const uploadParams = {
    Bucket: bucketName,
    Key: objectKey,
    Body: resizedImageBuffer,
  };

  const uploadCommand = new PutObjectCommand(uploadParams);
  await s3Client.send(uploadCommand);
  return resizedObjectUrl;
}

export default async function awsGenerateProductImageVariant(data) {
  if (getConfig("system.file_storage") === "s3") {
    try {
      const s3Client = new S3Client({ region: getEnv("AWS_REGION") });
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

      // Upload the single variant
      const singleUrl = await resizeAndUploadImage(
        s3Client,
        originalObjectUrl,
        singleObjectUrl,
        getConfig("catalog.product.image.single.width", 500),
        getConfig("catalog.product.image.single.height", 500)
      );

      // Upload the listing variant
      const listingUrl = await resizeAndUploadImage(
        s3Client,
        originalObjectUrl,
        listingObjectUrl,
        getConfig("catalog.product.image.listing.width", 250),
        getConfig("catalog.product.image.listing.height", 250)
      );

      // Upload the thumbnail variant
      const thumnailUrl = await resizeAndUploadImage(
        s3Client,
        originalObjectUrl,
        thumbnailObjectUrl,
        getConfig("catalog.product.image.thumbnail.width", 100),
        getConfig("catalog.product.image.thumbnail.height", 100)
      );

      // Update the record in the database with the new URLs in the variant columns
      await update("product_image")
        .given({
          single_image: singleUrl,
          listing_image: listingUrl,
          thumb_image: thumnailUrl,
        })
        .where("product_image_product_id", "=", data.product_image_product_id)
        .and("origin_image", "=", data.origin_image)
        .execute(pool);
    } catch (e) {
      error(e);
    }
  }
}
