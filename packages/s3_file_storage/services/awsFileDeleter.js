const {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');

const s3Client = new S3Client({ region: getEnv('AWS_REGION') });
const bucketName = getEnv('AWS_BUCKET_NAME');

module.exports.awsFileDeleter = {
  delete: async (path) => {
    const params = {
      Bucket: bucketName,
      Key: path
    };
    const headObjectCommand = new HeadObjectCommand(params);
    await s3Client.send(headObjectCommand);
    const deleteObjectCommand = new DeleteObjectCommand(params);
    await s3Client.send(deleteObjectCommand);
  }
};
