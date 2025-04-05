const { getFancyBitcoinPriceInCurrency } = require("../services/yahoofinance");
 
async function price(message, args) {
    let currency = args.length > 0 ? args[0].toUpperCase() : "USD";

    let fancyPrice = await getFancyBitcoinPriceInCurrency(currency);
    await message.reply(`**1 bitcoin** is worth **${fancyPrice}**`);
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