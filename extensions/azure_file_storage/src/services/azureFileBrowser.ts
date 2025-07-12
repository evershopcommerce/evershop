import { BlobServiceClient } from "@azure/storage-blob";
import { FileBrowser } from "@evershop/evershop/cms/services";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";

export const azureFileBrowser = {
  list: async (path) => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      getEnv("AZURE_STORAGE_CONNECTION_STRING")
    );
    const containerName = getEnv("AZURE_STORAGE_CONTAINER_NAME", "images");
    const containerClient = blobServiceClient.getContainerClient(containerName);
    // Create a container if it does not exist with access level set to public
    await containerClient.createIfNotExists({
      access: "blob",
    });

    if (path !== "") {
      path = `${path}/`;
    }
    const blobs = containerClient.listBlobsFlat({ prefix: path });
    const subfolders = new Set();
    const files: FileBrowser[] = [];

    for await (const blob of blobs) {
      const blobName = blob.name;
      const blobUrl = `${containerClient.url}/${blobName}`;
      const relativePath = blobName.substring(path.length);
      const slashIndex = relativePath.indexOf("/");
      if (slashIndex === -1) {
        // It's a file
        if (blob.properties.contentLength) {
          files.push({
            name: relativePath,
            url: blobUrl,
          });
        }
      } else {
        // It's a subfolder
        const subfolder = relativePath.substring(0, slashIndex);
        if (subfolder !== "") {
          subfolders.add(subfolder);
        }
      }
    }
    return {
      folders: Array.from(subfolders),
      files,
    };
  },
};
