import { merge } from "@evershop/evershop/lib/util/merge";
import { addProcessor } from "@evershop/evershop/lib/util/registry";
import { awsFileUploader } from "./services/awsFileUploader.js";
import { awsFileDeleter } from "./services/awsFileDeleter.js";
import { awsFolderCreator } from "./services/awsFolderCreator.js";
import { awsFileBrowser } from "./services/awsFileBrowser.js";

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
                enum: ["s3"],
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
    if (config === "s3") {
      return awsFileUploader;
    } else {
      return value;
    }
  });

  addProcessor("fileDeleter", function (value) {
    const { config } = this;
    if (config === "s3") {
      return awsFileDeleter;
    } else {
      return value;
    }
  });

  addProcessor("folderCreator", function (value) {
    const { config } = this;
    if (config === "s3") {
      return awsFolderCreator;
    } else {
      return value;
    }
  });

  addProcessor("fileBrowser", function (value) {
    const { config } = this;
    if (config === "s3") {
      return awsFileBrowser;
    } else {
      return value;
    }
  });
};
