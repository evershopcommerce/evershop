import { INVALID_PAYLOAD, OK } from '../../../../lib/util/httpStatus.js';
import { uploadFile } from '../../services/uploadFile.js';

export default async (request, response, next) => {
  if (!request.files || request.files.length === 0) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'No image was provided'
      }
    });
  } else {
    const files = await uploadFile(request.files, request.params[0] || '');
    response.status(OK).json({
      data: {
        files
      }
    });
  }
};
