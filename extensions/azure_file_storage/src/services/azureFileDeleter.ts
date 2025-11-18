import { BlobServiceClient } from "@azure/storage-blob";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";

export const azureFileDeleter = {
  delete: async (path: string) => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      getEnv("AZURE_STORAGE_CONNECTION_STRING")
    );
    const containerName = getEnv("AZURE_STORAGE_CONTAINER_NAME", "images");
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(path);
    const blobProperties = await blobClient.getProperties();

    if (blobProperties.contentType) {
      await blobClient.delete();
    } else {
      throw new Error(`Path "${path}" does not exist.`);
    }
  },
};
