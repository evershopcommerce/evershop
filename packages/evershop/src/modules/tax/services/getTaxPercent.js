module.exports.getTaxPercent = function getTaxPercent(rates) {
  let taxPercent = 0;

  rates.forEach((rate) => {
    let _rate = rate['rate'] / 100;
    if (rate['is_compound'] == true) {
      taxPercent = taxPercent + _rate + taxPercent * _rate;
    } else {
      taxPercent = taxPercent + _rate;
    }
  });

  return taxPercent * 100;
};
