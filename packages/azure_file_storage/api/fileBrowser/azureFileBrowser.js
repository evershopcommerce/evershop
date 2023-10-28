const { BlobServiceClient } = require('@azure/storage-blob');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');
const { debug } = require('@evershop/evershop/src/lib/log/debuger');
const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

let blobServiceClient;
let containerName;
if (getConfig('file_storage') === 'azure') {
  blobServiceClient = BlobServiceClient.fromConnectionString(
    getEnv('AZURE_STORAGE_CONNECTION_STRING')
  );
  containerName = getEnv('AZURE_STORAGE_CONTAINER_NAME', 'images');
}

module.exports = async (request, response, delegate, next) => {
  // If the file storage is not Azure, call the next middleware function
  if (getConfig('file_storage') !== 'azure') {
    next();
  } else {
    try {
      // Create a container if it does not exist
      const containerClient =
        blobServiceClient.getContainerClient(containerName);
      // Create a container if it does not exist with access level set to public
      await containerClient.createIfNotExists({
        access: 'blob'
      });

      let path = request.params[0] || '';

      if (path !== '') {
        path = `${path}/`;
      }
      const blobs = containerClient.listBlobsFlat({ prefix: path });
      const subfolders = new Set();
      const files = [];
      // eslint-disable-next-line no-restricted-syntax
      for await (const blob of blobs) {
        const blobName = blob.name;
        const blobUrl = `${containerClient.url}/${blobName}`;

        // Get the subfolder or file name within the directory
        const relativePath = blobName.substring(path.length);

        // Check if it's a subfolder or file
        const slashIndex = relativePath.indexOf('/');
        if (slashIndex === -1) {
          // It's a file
          files.push({
            name: relativePath,
            url: blobUrl
          });
        } else {
          // It's a subfolder
          const subfolder = relativePath.substring(0, slashIndex);
          subfolders.add(subfolder);
        }
      }
      // Send the response with the uploaded image details
      response.status(OK).json({
        data: {
          folders: Array.from(subfolders),
          files
        }
      });
    } catch (error) {
      debug('critical', error);
      // Return an error response if there was an error uploading the images
      response.status(INTERNAL_SERVER_ERROR);
      response.json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message: 'Error uploading images to Azure Blob Storage'
        }
      });
    }
  }
};
