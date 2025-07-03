import { getDelegates, setDelegate } from '../../../../../../../delegate.js';

let delegates;
function collection(request, response, next) {
  delegates = getDelegates(request);
  return response.status(200).json({
    ok: true
  });
}
export default collection;
export { delegates };
