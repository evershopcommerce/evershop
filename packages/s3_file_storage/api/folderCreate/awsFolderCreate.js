const { basename } = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');
const { debug } = require('@evershop/evershop/src/lib/log/debuger');
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

const s3Client = new S3Client({ region: getEnv('AWS_REGION') });
const bucketName = getEnv('AWS_BUCKET_NAME');

module.exports = async (request, response, delegate, next) => {
  // If the file storage is not S3, call the next middleware function
  if (getConfig('system.file_storage') !== 's3') {
    next();
  } else {
    try {
      const { path } = request.body || '';
      // Make sure path is not empty and has only 1 trailing slash at the end
      const requestedPath = path ? path.replace(/\/+$/, '') : '';
      if (!requestedPath) {
        response.status(INVALID_PAYLOAD);
        response.json({
          error: {
            status: INVALID_PAYLOAD,
            message: 'Path is empty'
          }
        });
      } else {
        const params = {
          Bucket: bucketName,
          Key: requestedPath
        };

        const uploadCommand = new PutObjectCommand(params);
        await s3Client.send(uploadCommand);
        // Send the response with the uploaded image details
        response.status(OK).json({
          data: {
            path,
            name: basename(path)
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
          message: 'Error uploading images to S3'
        }
      });
    }
  }
};
