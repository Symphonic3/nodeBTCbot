const axios = require('axios');
const { cachifyFunction } = require('../utils/utils.js');

const iso4217CurrencyCodes = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", 
  "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", 
  "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY", 
  "COP", "CRC", "CUC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", 
  "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "FOK", "GBP", "GEL", "GGP", 
  "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", 
  "HUF", "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", 
  "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", 
  "LBP", "LKR", "LRD", "LSL", "LTL", "LVL", "LYD", "MAD", "MDL", "MGA", 
  "MKD", "MMK", "MNT", "MOP", "MRO", "MUR", "MVR", "MWK", "MXN", "MYR", 
  "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", 
  "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", 
  "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLL", "SOS", "SRD", 
  "SSP", "STN", "SVC", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", 
  "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VND", 
  "VUV", "WST", "XAF", "XAG", "XAU", "XCD", "XOF", "XPD", "XPF", "XPT", 
  "YER", "ZAR", "ZMK", "ZMW", "ZWD"
];

async function getLatestClosePrice(ticker) {
  const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?includePrePost=true&interval=1m&range=1d`;

  try {
    // Fetch data from the API
    const response = await axios.get(apiUrl);
    const data = response.data;

    // Check if the required fields exist
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error('Invalid response structure');
    }

    const result = data.chart.result[0];
    const indicators = result.indicators.quote[0];
    const closePrices = indicators.close;

    // Loop through the array of close prices in reverse and find the first non-null value
    for (let i = closePrices.length - 1; i >= 0; i--) {
      if (closePrices[i] !== null) {
        return closePrices[i];
      }
    }

    // If no non-null value found, return null
    return null;
  } catch (error) {
    console.error('Error fetching or processing the data:', error.message);
    return null;
  }
}

async function getLatestBitcoinPriceUSD() {
  return await getLatestClosePrice("BTC-USD");
}

async function getLatestCurrencyPerOneUSD(currencySymbol) {
  return await getLatestClosePrice(currencySymbol.toUpperCase() + "=X");
}

const getBitcoinPriceUSD = cachifyFunction(getLatestBitcoinPriceUSD, 1000*60*2); //2 min
const getCurrencyPerOneUSD = cachifyFunction(getLatestCurrencyPerOneUSD, 1000*60*60); //1 hour

async function getBitcoinPriceInCurrency(currencySymbol) { 
  // usd/btc * currency/usd = currency/btc
  let bitcoinPrice = await getBitcoinPriceUSD();
  let currencyPerUSD = await getCurrencyPerOneUSD(currencySymbol);
  return bitcoinPrice*currencyPerUSD;
}

function checkCurrencySymbol(currencySymbol) {
  return iso4217CurrencyCodes.includes(currencySymbol.toUpperCase());
}

module.exports = { getBitcoinPriceUSD, getCurrencyPerOneUSD, getBitcoinPriceInCurrency, checkCurrencySymbol }