/* eslint-disable no-multi-assign */
/* eslint-disable global-require */
module.exports = exports = async function TranslationLoader(c) {
  const csvData = await this.getOptions().getTranslateData();
  //console.log('csvData', csvData);
  // Use regex to find all function call `t()` in the template string
  const regex =
    /_\s*\(\s*(?<arg1>["'][^"']*["']|\w+)\s*(?:,\s*(?<arg2>null|\{[\s\S]*?\}|[\w\.]+)\s*)?\)/g;
  let result = c;
  // Loop through each function call and get the template string
  let match;
  while ((match = regex.exec(c)) !== null) {
    let template = match.groups.arg1;
    // Remove the quote from the start and end of the template string
    template = template.replace(/^['"]|['"]$/g, '');
    const newValue = csvData[template];
    // Check if the template is exist in the csvData
    if (newValue) {
      result = result.replace(match[0], `_("${newValue}",${match[2] || null})`);
    }
  }

  return result;
};
