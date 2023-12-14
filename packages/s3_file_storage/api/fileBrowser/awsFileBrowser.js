const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
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
  // If the file storage is not S3, skip this middleware
  if (getConfig('system.file_storage') !== 's3') {
    next();
  } else {
    try {
      let path = request.params[0] || '';

      if (path !== '') {
        path = `${path}/`;
      }
      // Keep only one slash at the end of the path
      path = path.replace(/\/{2,}$/, '/');
      const params = {
        Bucket: bucketName,
        Prefix: path,
        Delimiter: '/'
      };
      const listObjectsCommand = new ListObjectsV2Command(params);
      const data = await s3Client.send(listObjectsCommand);
      const subfolders = data.CommonPrefixes
        ? data.CommonPrefixes.map((commonPrefix) =>
            commonPrefix.Prefix.replace(path, '').replace(/\/$/, '')
          ).filter((prefix) => prefix !== '')
        : [];
      const files = data.Contents
        ? data.Contents.filter((item) => item.Size !== 0).map((object) => {
            const fileName = object.Key.split('/').pop();
            const fileURL = `https://${bucketName}.s3.amazonaws.com/${object.Key}`;

            return {
              name: fileName,
              url: fileURL
            };
          })
        : [];

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
          message: 'Error listing files from S3'
        }
      });
    }
  }
};
