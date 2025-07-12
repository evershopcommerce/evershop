import path from "path";
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";
import { UploadedFile } from "@evershop/evershop/cms/services";

const s3Client = new S3Client({ region: getEnv("AWS_REGION") });
const bucketName = getEnv("AWS_BUCKET_NAME");

export const awsFileUploader = {
  upload: async (files: Express.Multer.File[], requestedPath: string) => {
    const uploadedFiles: UploadedFile[] = [];
    const uploadPromises: Promise<PutObjectCommandOutput>[] = [];

    for (const file of files) {
      const fileName = requestedPath
        ? `${requestedPath}/${file.filename}`
        : file.filename;
      const fileContent = file.buffer;
      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent,
      };

      const uploadCommand = new PutObjectCommand(params);
      const uploadPromise = s3Client.send(uploadCommand);
      uploadPromises.push(uploadPromise);
    }

    const uploadResults = await Promise.all(uploadPromises);
    uploadResults.forEach((result, index) => {
      uploadedFiles.push({
        name: files[index].filename,
        mimetype: files[index].mimetype,
        size: files[index].size,
        url: `https://${bucketName}.s3.amazonaws.com/${path.join(
          requestedPath,
          files[index].filename
        )}`,
      });
    });

    return uploadedFiles;
  },
};
