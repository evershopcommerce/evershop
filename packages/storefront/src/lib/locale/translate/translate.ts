import { loadCsvTranslationFiles } from '../../webpack/loaders/loadTranslationFromCsv.js';

let csvData: Record<string, string> | undefined;

/**
 * This function is used to translate the text form server side, like from middleware. For templating use the _ function
 */
export function translate(enText: string, values: Record<string, string> = {}) {
  const translatedText =
    csvData && csvData[enText] !== undefined ? csvData[enText] : enText;
  // Check if the data is null, undefined or empty object
  if (!values || Object.keys(values).length === 0) {
    return translatedText;
  } else {
    const template = `${translatedText}`;
    return template.replace(/\${(.*?)}/g, (match, key) =>
      values[key.trim()] !== undefined ? values[key.trim()] : match
    );
  }
}

export async function loadCsv(): Promise<Record<string, string>> {
  // Only load the csv files once
  if (csvData === undefined) {
    csvData = await loadCsvTranslationFiles();
  }
  return csvData;
}
