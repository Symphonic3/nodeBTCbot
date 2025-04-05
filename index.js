const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { checkCurrencySymbol, getBitcoinPriceInCurrency } = require('./services/yahoofinance.js');
const { formatCurrency } = require('./utils/utils.js');

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.BOT_PREFIX || '!';

// Bot will use all intents & partials
const client = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: Object.values(Partials),
});

// Bot is ready
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Respond to commands
client.on(Events.MessageCreate, async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    let price = await getBitcoinPriceInCurrency("RUB");
    message.reply(`**1 bitcoin** is worth **${formatCurrency(price, "RUB")}**`);
  }
});

client.login(TOKEN);