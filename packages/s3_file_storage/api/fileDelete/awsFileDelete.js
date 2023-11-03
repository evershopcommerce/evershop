const {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
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
  if (getConfig('system.file_storage') !== 's3') {
    next();
  } else {
    try {
      const path = request.params[0] || '';
      const params = {
        Bucket: bucketName,
        Key: path
      };
      const headObjectCommand = new HeadObjectCommand(params);
      await s3Client.send(headObjectCommand);
      const deleteObjectCommand = new DeleteObjectCommand(params);
      await s3Client.send(deleteObjectCommand);
      response.status(OK).json({
        data: {
          path
        }
      });
    } catch (error) {
      debug('critical', error);
      // Return an error response if there was an error uploading the images
      response.status(INTERNAL_SERVER_ERROR);
      response.json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message: 'Error deleting file from S3'
        }
      });
    }
  }
};
