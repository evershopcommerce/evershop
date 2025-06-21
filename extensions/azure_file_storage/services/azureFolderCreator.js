const { BlobServiceClient } = require('@azure/storage-blob');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');

module.exports.azureFolderCreator = {
  create: async (path) => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      getEnv('AZURE_STORAGE_CONNECTION_STRING')
    );
    const containerName = getEnv('AZURE_STORAGE_CONTAINER_NAME', 'images');
    // Create a container if it does not exist
    const containerClient = blobServiceClient.getContainerClient(containerName);
    // Create a container if it does not exist with access level set to public
    await containerClient.createIfNotExists({
      access: 'blob'
    });

    const blobClient = containerClient.getBlockBlobClient(`${path}/`);
    await blobClient.upload('', 0);
    return path;
  }
};
