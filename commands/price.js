const { checkCurrencySymbol, getBitcoinPriceInCurrency } = require("../services/yahoofinance");
const { formatCurrency } = require("../utils/utils");
 
async function price(message, args) {
    let currency = args.length > 0 ? args[0].toUpperCase() : "USD";
    if(!checkCurrencySymbol(currency)) {
        await message.reply("Unknown currency symbol.");
        return;
    }
    let price = await getBitcoinPriceInCurrency(currency);
    await message.reply(`**1 bitcoin** is worth **${formatCurrency(price, currency)}**`);
    return;
}

module.exports = {
    price: {
        execute: price
    },
    p: {
        execute: price
    }
}