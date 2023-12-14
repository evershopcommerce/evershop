const { addProcessor } = require('@evershop/evershop/src/lib/util/registry');
const { azureFileUploader } = require('./services/azureFileUploader');
const { azureFileDeleter } = require('./services/azureFileDeleter');
const { azureFolderCreator } = require('./services/azureFolderCreator');
const { azureFileBrowser } = require('./services/azureFileBrowser');

module.exports = () => {
  addProcessor('fileUploader', function (value) {
    const {config} = this;
    if (config === 'azure') {
      return azureFileUploader;
    } else {
      return value;
    }
  });

  addProcessor('fileDeleter', function (value) {
    const {config} = this;
    if (config === 'azure') {
      return azureFileDeleter;
    } else {
      return value;
    }
  });

  addProcessor('folderCreator', function (value) {
    const {config} = this;
    if (config === 'azure') {
      return azureFolderCreator;
    } else {
      return value;
    }
  });

  addProcessor('fileBrowser', function (value) {
    const {config} = this;
    if (config === 'azure') {
      return azureFileBrowser;
    } else {
      return value;
    }
  });
};
