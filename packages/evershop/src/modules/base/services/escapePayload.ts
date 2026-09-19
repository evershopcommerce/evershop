import secret from '../../../modules/base/services/secret.js';

function escapeHtmlTags(str) {
  const regex = /<([a-zA-Z]+)(?:\s[^>]*)?>|<\/([a-zA-Z]+)>/g;
  const replacements = {
    '<': '&lt;',
    '>': '&gt;'
  };
  return str.replace(regex, (match) =>
    match.replace(/[<>&"']/g, (char) => replacements[char] || char)
  );
}

export default function escapePayload(obj) {
  if (obj === null || typeof obj !== 'object') {
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item) => escapePayload(item));
    return;
  }
  // Fields registered on this object to skip HTML escaping
  const skipFields = Array.isArray(obj[secret]) ? obj[secret] : [];
  for (const prop in obj) {
    // Skip the secret marker itself
    if (prop === secret) continue;
    // Skip fields explicitly marked to bypass escaping
    if (skipFields.includes(prop)) continue;
    if (typeof obj[prop] === 'string') {
      obj[prop] = escapeHtmlTags(obj[prop]);
    } else if (Array.isArray(obj[prop])) {
      obj[prop].forEach((item) => escapePayload(item));
    } else if (typeof obj[prop] === 'object' && obj[prop] !== null) {
      escapePayload(obj[prop]);
    }
  }
  delete obj[secret];
}
