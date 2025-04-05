const { getItemPrice, isSingleItem, formatItem, getAllItems } = require("../services/items");
const { getBitcoinPriceInCurrency, formatCurrency, getBitcoinPriceUSD } = require("../services/yahoofinance");
 
async function price(message, args) {
  if (args.length == 1 && args[0].toLowerCase() == 'help') {
    await message.reply('**Currency Examples**: !p gbp, !p cad, !p xau');
    await message.reply(`**Other Supported Items:** ${getAllItems().join(', ')}`);
    await message.reply("**!p <item> sats** will give you the cost of the item in satoshis");
    return;
  }

  let unit = args.length > 0 ? args[0].toUpperCase() : "USD";
  const itemPrice = getItemPrice(unit.toLowerCase());

  if (isNaN(itemPrice) && isNaN((await getBitcoinPriceInCurrency(unit)))) {
    await message.reply('Invalid symbol.');
    return;
  } 

  if (args[1] == undefined || !args[1].toLowerCase().startsWith('sat')) {
    // Normal pricing

    if (isNaN(itemPrice)) {
      // It must be a currency
      const price = await getBitcoinPriceInCurrency(unit);
  
      await worth(message, "1 bitcoin", formatCurrency(price, unit));
    } else {
      // It must be an item
      const bitcoinPrice = await getBitcoinPriceUSD();
      const itemPrice = getItemPrice(unit.toLowerCase());
  
      if (isSingleItem(unit.toLowerCase())) {
        // usd/item / usd/bitcoin = bitcoin/item
        const bitcoinAmount = itemPrice / bitcoinPrice;
        await worth(message, formatItem(1, unit.toLowerCase()), `${bitcoinAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} bitcoin`);
      } else {
        // usd/bitcoin / usd/item = item/bitcoin
        const itemAmount = bitcoinPrice / itemPrice;
        await worth(message, "1 bitcoin", formatItem(itemAmount, unit.toLowerCase()));
      }
    }
  } else {
    // Sats pricing

    if (isNaN(itemPrice)) {
      // It must be a currency
      // sat/btc / currency/btc = sat/currency
      const satPriceCurrency = 1_0000_0000 / await getBitcoinPriceInCurrency(unit);
      
      // All currencies become single when priced in sats
      await worth(message, formatCurrency(1, unit), `${satPriceCurrency.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} satoshis`);
    } else {
      // It must be an item
      // usd/btc / sat/btc = usd/sat
      const satPrice = await getBitcoinPriceUSD() / 1_0000_0000;
      const itemPrice = getItemPrice(unit.toLowerCase());
      
      // All items become single when priced in sats
      // usd/item / usd/sat = sat/item
      const satAmount = itemPrice / satPrice;
      await worth(message, formatItem(1, unit.toLowerCase()), `${satAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} satoshis`);
    
    }
  }
}

async function convert(message, args) {
  if (args.length == 1) {
    await message.reply('To use convert use the format: !convert 15.00 USD BTC or !convert 10000 sat mBTC');
    return;
  }
  if (!args.length == 3) {
    await message.reply('Invalid format.');
    return;
  }

  const amount = parseFloat(args[0]);
  if (isNaN(amount)) {
    await message.reply('Invalid amount.');
    return;
  }

  const a = args[1].toUpperCase();
  const itemPriceA = getItemPrice(a.toLowerCase());
  
  if (isNaN(itemPriceA) && isNaN(await getBitcoinPriceInCurrency(a))) {
    await message.reply('Invalid symbol.');
    return;
  } 

  const b = args[2].toUpperCase();
  const itemPriceB = getItemPrice(b.toLowerCase());
  if (isNaN(itemPriceB) && isNaN(await getBitcoinPriceInCurrency(b))) {
    await message.reply('Invalid symbol.');
    return;
  }

  let nBitcoin;

  if (isNaN(itemPriceA)) {
    // A is a currency
    nBitcoin = amount * 1 / (await getBitcoinPriceInCurrency(a));
  } else {
    // A is an item
    nBitcoin = amount * itemPriceA / (await getBitcoinPriceUSD());
  }

  let formattedB;

  if (isNaN(itemPriceB)) {
    // B is a currency
    formattedB = formatCurrency(nBitcoin * (await getBitcoinPriceInCurrency(b)), b);
  } else {
    // B is an item
    formattedB = formatItem(nBitcoin / (itemPriceB / (await getBitcoinPriceUSD())), b.toLowerCase());
  }

  const formattedA = isNaN(itemPriceA) ? formatCurrency(amount, a) : formatItem(amount, a.toLowerCase());

  await worth(message, formattedA, formattedB);
}

async function wage(message, args) {
  if (args.length != 2) {
    await message.reply("To use wage include the hourly amount earned in the wage and a currency. ex. `wage 15.00 USD`");
    return;
  }

  const amount = parseFloat(args[0]);
  if (isNaN(amount)) {
    await message.reply('Invalid amount.');
    return;
  }

  const currency = args[1].toUpperCase();
  
  if (isNaN(await getBitcoinPriceInCurrency(currency))) {
    await message.reply('Invalid symbol.');
    return;
  }

  await worth(message, "1 bitcoin", ((await getBitcoinPriceInCurrency(currency))/amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " of your hours");
}

/**
 * Short helper to reply a worth statement; a is worth b.
 * @param {*} message The message to reply to
 * @param {*} a formatted quantity of a
 * @param {*} b formatted quantity of b
 */
async function worth(message, a, b) {
  await message.reply(`**${a}** is worth **${b}**`);
}

module.exports = {
  price: {
    execute: price
  },
  p: {
    execute: price
  },
  convert: {
    execute: convert
  },
  wage: {
    execute: wage
  }
}