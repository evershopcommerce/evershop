import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";

const s3Client = new S3Client({ region: getEnv("AWS_REGION") });
const bucketName = getEnv("AWS_BUCKET_NAME");

export const awsFileBrowser = {
  list: async (path: string) => {
    if (path !== "") {
      path = `${path}/`;
    }
    // Keep only one slash at the end of the path

    path = path.replace(/\/{2,}$/, "/");
    const params = {
      Bucket: bucketName,
      Prefix: path,
      Delimiter: "/",
    };
    const listObjectsCommand = new ListObjectsV2Command(params);
    const data = await s3Client.send(listObjectsCommand);
    const subfolders = data.CommonPrefixes
      ? data.CommonPrefixes.map((commonPrefix) =>
          commonPrefix.Prefix?.replace(path, "").replace(/\/$/, "")
        ).filter((prefix) => prefix !== "")
      : [];
    const files = data.Contents
      ? data.Contents.filter((item) => item.Size !== 0).map((object) => {
          const fileName = object.Key?.split("/").pop();
          const fileURL = `https://${bucketName}.s3.amazonaws.com/${object.Key}`;

          return {
            name: fileName,
            url: fileURL,
          };
        })
      : [];

    return {
      folders: Array.from(subfolders),
      files,
    };
  },
};
