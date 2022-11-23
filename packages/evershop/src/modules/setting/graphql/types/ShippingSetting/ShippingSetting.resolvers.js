module.exports = {
  Setting: {
    allowCountries: (setting, { _ }, { pool }) => {
      const allowCountries = setting.find(s => s.name === 'allowCountries');
      if (allowCountries && allowCountries.value) {
        return JSON.parse(allowCountries.value);
      } else {
        return [];
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