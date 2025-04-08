const axios = require('axios');
const { cachifyFunction } = require('../utils/utils.js');
const { notifyNewPrice } = require('./ath.js');

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
    if (ticker.toUpperCase() == "BTC-USD") {
      notifyNewPrice(result.meta.fiftyTwoWeekHigh);
    }
    
    return result.meta.regularMarketPrice;

  } catch (error) {
    console.error('Error fetching or processing the data:', error.message);
    return null;
  }
}

async function getLatestBitcoinPriceUSD() {
  const price = await getLatestClosePrice("BTC-USD");

  // let ath service know
  notifyNewPrice(price);
  return price;
}

async function getLatestTicker(tickerSymbol) {
  return await getLatestClosePrice(tickerSymbol);
}

/**
 * Gets the bitcoin price in USD, cached at 1 minute.
 */
const getBitcoinPriceUSD = cachifyFunction(getLatestBitcoinPriceUSD, 1000*60*1); //1 min
const getTicker = cachifyFunction(getLatestTicker, 1000*60*60); //1 hour

async function getBitcoinPriceInTicker(tickerSymbol) { // A ticker is normally a currency of format i.e. "CAD=X", but it could be unique for silver/gold etc. cases
  let bitcoinPrice = await getBitcoinPriceUSD();
  let ticker = await getTicker(tickerSymbol);

  // usd/btc * currency/usd = currency/btc
  if (tickerSymbol.endsWith("=X"))
    return bitcoinPrice*ticker;
  // usd/btc / usd/ticker = ticker/btc
  else
    return bitcoinPrice/ticker;
}

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

const CURRENCY_FORMAT_DICT = {
  "USD": { symbol: "$", name: "USD"},
  "CAD": { symbol: "$", name: "Canadian Dollar"},
  "GBP": { symbol: "£", name: "British Pounds"},
  "EUR": { symbol: "€", name: "Euros"},
  "BRL": { symbol: "R$", name: "Brazilian Reais"},
  "VEF": { symbol: "B$", name: "Venezuelan Bolívar"},
  "JPY": { symbol: "¥", name: "Japanese Yen"},
  "CNY": { symbol: "¥", name: "Chinese Renminbi"},
  "ILS": { symbol: "₪", name: "Israeli Shekalim"},
  "INR": { symbol: "₹", name: "Indian Rupees"},
  "ZAR": { symbol: "R", name: "South African Rands"},
  "RUB": { symbol: "₽", name: "Russian Rubles"},
  "XAU": { symbol: "", name: "ounces of gold", replaceCode: "GC=F"},
  "XAG": { symbol: "", name: "ounces of silver", replaceCode: "SI=F"},
  "BTC": { symbol: "", name: "bitcoin", replaceCode: "BTC-USD"}
};

/**
 * Formats an amount of currency as a nice string
 * @param {number|string} amount 
 * @param {string} currency 
 * @returns {string}
 */
function formatCurrency(amount, currency) {
  // Normalize currency to uppercase
  const currencyUpper = currency.toUpperCase();

  // Check if the currency exists in the dictionary
  if (CURRENCY_FORMAT_DICT[currencyUpper]) {
    const { symbol, name } = CURRENCY_FORMAT_DICT[currencyUpper];

    const formattedAmount = amount?.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') ?? 0;
    return `${symbol}${formattedAmount} ${name}`;
  }

  // If the currency is not found in the dictionary, fall back to a simple format
  return `${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ${currencyUpper}`;
}

/**
 * Gets the bitcoin price in a currency, where the bitcoin-usd price
 * is cached at 1 minute and the usd-currency price is cached at 1 hour.
 * @param {string} currencySymbol - an ISO 4217 3-letter currency code, including XAG and XAU.
 */
async function getBitcoinPriceInCurrency(currencySymbol) {
  let currencyUpper = currencySymbol.toUpperCase()

  // Check if it's a valid currency
  if (!iso4217CurrencyCodes.includes(currencyUpper))
    return NaN;

  // Convert the currency code to a special code if necessary
  let useCurrencyCode = CURRENCY_FORMAT_DICT[currencyUpper]?.replaceCode ? CURRENCY_FORMAT_DICT[currencyUpper].replaceCode : (currencyUpper + "=X");
  
  let price = await getBitcoinPriceInTicker(useCurrencyCode);
  return price;
}

module.exports = { getBitcoinPriceUSD, getBitcoinPriceInCurrency, formatCurrency }