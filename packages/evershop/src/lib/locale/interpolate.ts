/**
 * Substitute `${var}` placeholders in an (already looked-up) string. Shared by `_`
 * (client/template) and `translate` (server) so the interpolation rule lives in one
 * place. A placeholder whose key is absent from `values` is left untouched; keys are
 * trimmed. Substitution is single-pass — a value that itself contains `${…}` is NOT
 * re-substituted. Isomorphic and pure (no imports).
 */
export function interpolate(
  text: string,
  values?: Record<string, string>
): string {
  if (!values || Object.keys(values).length === 0) {
    return text;
  }
  return text.replace(/\${(.*?)}/g, (match, key) =>
    values[key.trim()] !== undefined ? values[key.trim()] : match
  );
}
