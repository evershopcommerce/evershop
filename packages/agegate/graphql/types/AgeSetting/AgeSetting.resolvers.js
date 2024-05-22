module.exports = {
  Setting: {
    minAge: (setting) => {
      const minAge = setting.find((s) => s.name === 'minAge');
      if (minAge) {
        return minAge.value;
      } else {
        return 18;
      }
    }
  }
};
