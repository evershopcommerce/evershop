import { merge } from "@evershop/evershop/lib/util/merge";
import { addProcessor } from "@evershop/evershop/lib/util/registry";
import { azureFileBrowser } from "./services/azureFileBrowser.js";
import { azureFileDeleter } from "./services/azureFileDeleter.js";
import { azureFolderCreator } from "./services/azureFolderCreator.js";
import { azureFileUploader } from "./services/azureFileUploader.js";

export default () => {
  addProcessor("configurationSchema", (schema) => {
    merge(
      schema as any,
      {
        properties: {
          system: {
            type: "object",
            properties: {
              file_storage: {
                enum: ["azure"],
              },
            },
          },
        },
      },
      100
    );
    return schema;
  });
  addProcessor("fileUploader", function (value) {
    const { config } = this;
    if (config === "azure") {
      return azureFileUploader;
    } else {
      return value;
    }
  });

  addProcessor("fileDeleter", function (value) {
    const { config } = this;
    if (config === "azure") {
      return azureFileDeleter;
    } else {
      return value;
    }
  });

  addProcessor("folderCreator", function (value) {
    const { config } = this;
    if (config === "azure") {
      return azureFolderCreator;
    } else {
      return value;
    }
  });

  addProcessor("fileBrowser", function (value) {
    const { config } = this;
    if (config === "azure") {
      return azureFileBrowser;
    } else {
      return value;
    }
  });
};
