import path from 'path';

export const generateFileName = (originalname) => {
  const extension = path.extname(originalname);
  const name = path.basename(originalname, extension);
  // Replace special characters and white spaces with a -
  const fileName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return `${fileName}${extension}`;
};
