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
if (getConfig('system.file_storage') === 'azure') {
  blobServiceClient = BlobServiceClient.fromConnectionString(
    getEnv('AZURE_STORAGE_CONNECTION_STRING')
  );
  containerName = getEnv('AZURE_STORAGE_CONTAINER_NAME', 'images');
}

module.exports = async (request, response, delegate, next) => {
  // If the file storage is not Azure, call the next middleware function
  if (getConfig('system.file_storage') !== 'azure') {
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

      const imageFiles = request.files;
      const requestedPath = request.params[0] || '';

      const uploadedFiles = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const imageFile of imageFiles) {
        // Create a block blob client object that points to the blob where the image will be uploaded
        const path = requestedPath
          ? `${requestedPath}/${imageFile.filename}`
          : `${imageFile.filename}`;
        const blobClient = containerClient.getBlockBlobClient(path);

        // Upload the image file to the blob
        await blobClient.upload(imageFile.buffer, imageFile.buffer.length);
        // Push the uploaded image details to the uploadedFiles array
        uploadedFiles.push({
          name: imageFile.filename,
          type: imageFile.minetype,
          size: imageFile.size,
          url: blobClient.url
        });
      }

      // Send the response with the uploaded image details
      response.status(OK).json({
        data: {
          files: uploadedFiles
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
