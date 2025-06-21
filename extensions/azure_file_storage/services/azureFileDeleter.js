const { BlobServiceClient } = require('@azure/storage-blob');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');

module.exports.azureFileDeleter = {
  delete: async (path) => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      getEnv('AZURE_STORAGE_CONNECTION_STRING')
    );
    const containerName = getEnv('AZURE_STORAGE_CONTAINER_NAME', 'images');
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(path);
    const blobProperties = await blobClient.getProperties();

    if (blobProperties.contentType) {
      await blobClient.delete();
    } else {
      throw new Error(`Path "${path}" does not exist.`);
    }
  }
};
