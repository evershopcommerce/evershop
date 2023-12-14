const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');
const { debug } = require('@evershop/evershop/src/lib/log/debuger');
const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

const s3Client = new S3Client({ region: getEnv('AWS_REGION') });
const bucketName = getEnv('AWS_BUCKET_NAME');

module.exports = async (request, response, delegate, next) => {
  // If the file storage is not S3, call the next middleware function
  if (getConfig('system.file_storage') !== 's3') {
    next();
  } else {
    const imageFiles = request.files;
    const requestedPath = request.params[0] || '';

    const uploadedFiles = [];
    const uploadPromises = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const imageFile of imageFiles) {
      const fileName = requestedPath
        ? `${requestedPath}/${imageFile.filename}`
        : imageFile.filename;
      const fileContent = imageFile.buffer;
      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent
      };

      const uploadCommand = new PutObjectCommand(params);
      const uploadPromise = s3Client.send(uploadCommand);
      uploadPromises.push(uploadPromise);
    }
    try {
      const uploadResults = await Promise.all(uploadPromises);
      uploadResults.forEach((result, index) => {
        uploadedFiles.push({
          name: imageFiles[index].filename,
          path: path.join(requestedPath, imageFiles[index].filename),
          size: imageFiles[index].size,
          url: `https://${bucketName}.s3.amazonaws.com/${path.join(
            requestedPath,
            imageFiles[index].filename
          )}`
        });
      });
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
          message: 'Error uploading images to S3'
        }
      });
    }
  }
};
