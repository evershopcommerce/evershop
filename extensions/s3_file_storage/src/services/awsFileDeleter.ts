import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";

const s3Client = new S3Client({ region: getEnv("AWS_REGION") });
const bucketName = getEnv("AWS_BUCKET_NAME");

export const awsFileDeleter = {
  delete: async (path: string) => {
    const params = {
      Bucket: bucketName,
      Key: path,
    };
    const headObjectCommand = new HeadObjectCommand(params);
    await s3Client.send(headObjectCommand);
    const deleteObjectCommand = new DeleteObjectCommand(params);
    await s3Client.send(deleteObjectCommand);
  },
};
