const { BlobServiceClient } = require('@azure/storage-blob');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');

module.exports.azureFileUploader = {
  upload: async (files, path) => {
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

    const requestedPath = path;
    const uploadedFiles = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      // Create a block blob client object that points to the blob where the image will be uploaded
      const path = requestedPath
        ? `${requestedPath}/${file.filename}`
        : `${file.filename}`;
      const blobClient = containerClient.getBlockBlobClient(path);

      // Upload the file to the blob
      await blobClient.upload(file.buffer, file.buffer.length);
      // Push the uploaded image details to the uploadedFiles array
      uploadedFiles.push({
        name: file.filename,
        type: file.minetype,
        size: file.size,
        url: blobClient.url
      });
    }

    return uploadedFiles;
  }
};
