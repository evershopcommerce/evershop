const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getEnv } = require('@evershop/evershop/src/lib/util/getEnv');

const s3Client = new S3Client({ region: getEnv('AWS_REGION') });
const bucketName = getEnv('AWS_BUCKET_NAME');

module.exports.awsFileUploader = {
  upload: async (files, requestedPath) => {
    const uploadedFiles = [];
    const uploadPromises = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      const fileName = requestedPath
        ? `${requestedPath}/${file.filename}`
        : file.filename;
      const fileContent = file.buffer;
      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent
      };

      const uploadCommand = new PutObjectCommand(params);
      const uploadPromise = s3Client.send(uploadCommand);
      uploadPromises.push(uploadPromise);
    }

    const uploadResults = await Promise.all(uploadPromises);
    uploadResults.forEach((result, index) => {
      uploadedFiles.push({
        name: files[index].filename,
        path: path.join(requestedPath, files[index].filename),
        size: files[index].size,
        url: `https://${bucketName}.s3.amazonaws.com/${path.join(
          requestedPath,
          files[index].filename
        )}`
      });
    });

    return uploadedFiles;
  }
};
