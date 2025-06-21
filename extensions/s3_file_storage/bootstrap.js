const { merge } = require('@evershop/evershop/src/lib/util/merge');
const { addProcessor } = require('@evershop/evershop/src/lib/util/registry');
const { awsFileBrowser } = require('./services/awsFileBrowser');
const { awsFileDeleter } = require('./services/awsFileDeleter');
const { awsFileUploader } = require('./services/awsFileUploader');
const { awsFolderCreator } = require('./services/awsFolderCreator');

module.exports = () => {
  addProcessor('configuratonSchema', (schema) => {
    merge(
      schema,
      {
        properties: {
          system: {
            type: 'object',
            properties: {
              file_storage: {
                enum: ['s3']
              }
            }
          }
        }
      },
      100
    );
    return schema;
  });
  addProcessor('fileUploader', function (value) {
    const { config } = this;
    if (config === 's3') {
      return awsFileUploader;
    } else {
      return value;
    }
  });

  addProcessor('fileDeleter', function (value) {
    const { config } = this;
    if (config === 's3') {
      return awsFileDeleter;
    } else {
      return value;
    }
  });

  addProcessor('folderCreator', function (value) {
    const { config } = this;
    if (config === 's3') {
      return awsFolderCreator;
    } else {
      return value;
    }
  });

  addProcessor('fileBrowser', function (value) {
    const { config } = this;
    if (config === 's3') {
      return awsFileBrowser;
    } else {
      return value;
    }
  });
};
