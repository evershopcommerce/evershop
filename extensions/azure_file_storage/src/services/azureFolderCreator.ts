import { BlobServiceClient } from "@azure/storage-blob";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";

export const azureFolderCreator = {
  create: async (path: string) => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      getEnv("AZURE_STORAGE_CONNECTION_STRING")
    );
    const containerName = getEnv("AZURE_STORAGE_CONTAINER_NAME", "images");
    // Create a container if it does not exist
    const containerClient = blobServiceClient.getContainerClient(containerName);
    // Create a container if it does not exist with access level set to public
    await containerClient.createIfNotExists({
      access: "blob",
    });

    const blobClient = containerClient.getBlockBlobClient(`${path}/`);
    await blobClient.upload("", 0);
    return path;
  },
};
