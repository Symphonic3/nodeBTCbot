const { getItemPrice, isSingleItem, formatItem, getAllItems } = require("../services/items");
const { getBitcoinPriceInCurrency, formatCurrency, getBitcoinPriceUSD } = require("../services/yahoofinance");
 
async function price(message, args) {
  switch (args.length) {
    case 0:
      await convert(message, ["1", "BTC", "USD"]);
      return;
    case 1:
      const arg = args[0].toLowerCase();
      if (arg == "help") {
        await message.channel.send('**Currency Examples**: !p gbp, !p cad, !p xau');
        await message.channel.send(`**Other Supported Items:** ${getAllItems().join(', ')}`);
        await message.channel.send("**!p <item1> <item2>** will compare the cost of two items.");
      } if (isSingleItem(arg)) {
        await convert(message, ["1", arg, "BTC"]);
      } else {
        await convert(message, ["1", "BTC", arg]);
      }

      return;
      default: await convert(message, ["1", args[0], args[1]]);
  }
}

const btcUnits = {
  MSAT: { price: 100000000, symbol: "msat" },
  SAT: { price: 100000000, symbol: "sat" },
  SATS: { price: 100000000, symbol: "sats" },
  UBTC: { price: 1000000, symbol: "μBTC" },
  MBTC: { price: 1000, symbol: "mBTC" },
  CBTC: { price: 100, symbol: "cBTC" },
  DBTC: { price: 10, symbol: "dBTC" },
  BTC: { price: 1, symbol: "bitcoin" }
};

function countTrailingZeroes(num) {
  if (num === 0) return 1; // Special case: 0 has 1 trailing zero

  let count = 0;
  while (num % 10 === 0) {
    count++;
    num /= 10;
  }
  return count;
}

async function convert(message, args) {
  if (args.length < 3) {
    await message.channel.send('To use convert use the format: !convert 15.00 USD BTC or !convert 10000 sat mBTC');
    return;
  }

  const amount = parseFloat(args[0]);
  if (isNaN(amount)) {
    await message.channel.send('Invalid amount.');
    return;
  }

  const a = args[1].toUpperCase();
  const itemPriceA = getItemPrice(a.toLowerCase());
  
  if (!btcUnits[a] && isNaN(itemPriceA) && isNaN(await getBitcoinPriceInCurrency(a))) {
    await message.channel.send('Invalid symbol.');
    return;
  }

  let nBitcoin;

  if (btcUnits[a]) {
    // A is a btc unit
    nBitcoin = amount * 1 / btcUnits[a].price;
  } else if (isNaN(itemPriceA)) {
    // A is a currency
    nBitcoin = amount * 1 / (await getBitcoinPriceInCurrency(a));
  } else {
    // A is an item
    nBitcoin = amount * itemPriceA / (await getBitcoinPriceUSD());
  }

  const otheritems = args.slice(2);

  let resultOtherItems = [];
  for (let i = 0; i < otheritems.length; i++) {
    const b = otheritems[i].toUpperCase();
    const itemPriceB = getItemPrice(b.toLowerCase());
    if (!btcUnits[b] && isNaN(itemPriceB) && isNaN(await getBitcoinPriceInCurrency(b))) {
      await message.channel.send('Invalid symbol.');
      return;
    }

    let formattedB;

    if (btcUnits[b]) {
      // B is a btc unit
      formattedB = (nBitcoin * btcUnits[b].price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: Math.max(0, 8-countTrailingZeroes(btcUnits[b].price)) }) + " " + btcUnits[b].symbol;
    } else if (isNaN(itemPriceB)) {
      // B is a currency
      formattedB = formatCurrency(nBitcoin * (await getBitcoinPriceInCurrency(b)), b);
    } else {
      // B is an item
      formattedB = formatItem(nBitcoin / (itemPriceB / (await getBitcoinPriceUSD())), b.toLowerCase());
    }

    resultOtherItems.push(formattedB);
  }

  const formattedA = btcUnits[a] ?
    (nBitcoin * btcUnits[a].price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 }) + " " + btcUnits[a].symbol :
    (isNaN(itemPriceA) ? formatCurrency(amount, a) : formatItem(amount, a.toLowerCase()));

  await worth(message, formattedA, resultOtherItems.join(', '));
}

async function wage(message, args) {
  if (args.length != 2) {
    await message.channel.send("To use wage include the hourly amount earned in the wage and a currency. ex. `wage 15.00 USD`");
    return;
  }

  const amount = parseFloat(args[0]);
  if (isNaN(amount)) {
    await message.channel.send('Invalid amount.');
    return;
  }

  const currency = args[1].toUpperCase();
  
  if (isNaN(await getBitcoinPriceInCurrency(currency))) {
    await message.channel.send('Invalid symbol.');
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
  await message.channel.send(`**${a}** is worth **${b}**`);
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
