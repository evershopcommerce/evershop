module.exports = {
  Setting: {
    allowedCountries: (setting, { _ }, { pool }) => {
      const allowedCountries = setting.find(s => s.name === 'allowedCountries');
      if (allowedCountries && allowedCountries.value) {
        return JSON.parse(allowedCountries.value);
      } else {
        return ['US'];
      }
    },
    weightUnit: (setting, { _ }, { pool }) => {
      const weightUnit = setting.find(s => s.name === 'weightUnit');
      if (weightUnit) {
        return weightUnit.value;
      } else {
        return 'kg';
      }
    }
  }
}