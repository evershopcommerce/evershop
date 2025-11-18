import { BlobServiceClient } from "@azure/storage-blob";
import { UploadedFile } from "@evershop/evershop/cms/services";
import { getEnv } from "@evershop/evershop/lib/util/getEnv";

export const azureFileUploader = {
  upload: async (files: Express.Multer.File[], path: string) => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      getEnv("AZURE_STORAGE_CONNECTION_STRING")
    );
    const containerName = getEnv("AZURE_STORAGE_CONTAINER_NAME", "images");
    // Create a container if it does not exist
    const containerClient = blobServiceClient.getContainerClient(containerName);
    // Create a container if it does not exist with access level set to public
    await containerClient.createIfNotExists({
      access: "blob",
    });

    const requestedPath = path;
    const uploadedFiles: UploadedFile[] = [];

    for (const file of files) {
      // Create a block blob client object that points to the blob where the image will be uploaded
      const path = requestedPath
        ? `${requestedPath}/${file.filename}`
        : `${file.filename}`;
      const blobClient = containerClient.getBlockBlobClient(path);

      // Upload the file to the blob
      await blobClient.upload(file.buffer, file.buffer.length);
      // Push the uploaded image details to the uploadedFiles array
      uploadedFiles.push({
        name: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: blobClient.url,
      });
    }

    return uploadedFiles;
  },
};
