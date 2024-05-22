const { request, response } = require('express');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { addProcessor } = require('@evershop/evershop/src/lib/util/registry');

const isoCodes = {
    USD: "USD",
    VND: "VND"
};

const conversionTable = {
    [isoCodes.USD]: {
        [isoCodes.VND]: 25000
    }
};

const convertFromUSD = (amount, toCurrency) => {
    if (toCurrency === isoCodes.USD) {
        return amount
    }
    const ratio = conversionTable[isoCodes.USD][toCurrency];
    return amount * ratio;
};

module.exports = () => {
    request.isAdmin = function isAdmin() {
        return !!this.path.startsWith('/admin')
    }
    response.setIsoCodeCookie = function setIsoCodeCookie(isoCode) {
        // TODO: set by conditions
        this.cookie('isoCode', isoCode || getConfig('shop.currency', 'USD'), {});
    }
    addProcessor('priceValByExnRatio', ({ rawPrice, isoCode }) => {
        const priceByRatio = convertFromUSD(parseFloat(rawPrice), isoCode);
        return priceByRatio;
    });

    addProcessor('priceTextByExnRatio', ({ rawPrice, isoCode }) => {
        const priceByRatio = convertFromUSD(parseFloat(rawPrice), isoCode);
        const language = isoCode === 'VND' ? 'vi-VN' : getConfig('shop.language', 'en');
        return new Intl.NumberFormat(language, {
            style: 'currency',
            currency: isoCode
        }).format(priceByRatio);
    });
};