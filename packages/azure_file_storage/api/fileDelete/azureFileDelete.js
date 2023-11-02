const { BlobServiceClient } = require('@azure/storage-blob');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');
const { debug } = require('@evershop/evershop/src/lib/log/debuger');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

let blobServiceClient;
let containerName;
if (getConfig('system.file_storage') === 'azure') {
  blobServiceClient = BlobServiceClient.fromConnectionString(
    getEnv('AZURE_STORAGE_CONNECTION_STRING')
  );
  containerName = getEnv('AZURE_STORAGE_CONTAINER_NAME', 'images');
}

module.exports = async (request, response, delegate, next) => {
  if (getConfig('system.file_storage') !== 'azure') {
    next();
  } else {
    try {
      const containerClient =
        blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists({
        access: 'blob'
      });

      const path = request.params[0] || '';
      const blobClient = containerClient.getBlobClient(path);
      const blobProperties = await blobClient.getProperties();

      if (blobProperties.contentType) {
        await blobClient.delete();
        response.status(OK).json({
          data: {
            path
          }
        });
      } else {
        response.status(INVALID_PAYLOAD).json({
          error: {
            status: INVALID_PAYLOAD,
            message: `Path "${path}" is not a file (no content type).`
          }
        });
      }
    } catch (error) {
      debug('critical', error);
      // Return an error response if there was an error uploading the images
      response.status(INTERNAL_SERVER_ERROR);
      response.json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message: 'Error deleting file from Azure Blob Storage'
        }
      });
    }
  }
};
