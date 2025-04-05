const { Client, GatewayIntentBits, Partials, Events, ActivityType, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const { formatCurrency, getBitcoinPriceUSD } = require('./services/yahoofinance');
const { getCaptchaImage, captchaForUser } = require('./services/captcha');

const TOKEN = process.env.DISCORD_TOKEN;

// Bot will use all intents & partials
const client = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: Object.values(Partials),
});
client.prefix = process.env.BOT_PREFIX || '!';

// Dynamically load command from js files
client.commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));;
for (const file of commandFiles) {
  const commands = require('./commands/' + file); // path.join didn't work here on windows and i don't know why and i'm not fixing it
  Object.entries(commands).forEach(([commandName, command]) => {
    client.commands.set(commandName, command);
  });
}

async function updatePresence() {
  let newPresence = formatCurrency(await getBitcoinPriceUSD(), "USD"); // Get the updated presence text

  try {
    await client.user.setPresence({
      activities: [{ name: newPresence, type: ActivityType.Watching }],
      status: 'online',
    });
  } catch (error) {
    console.error("Error updating presence:");
    console.error(error);
  }
}

// Bot is ready
client.once(Events.ClientReady, async () => {
  await updatePresence();
  console.log(`✅ Logged in as ${client.user.tag}`);
  // Set an interval to update the bot's presence every 10 seconds
  setInterval(updatePresence, 10000);
});

// Respond to commands
client.on(Events.MessageCreate, async (message) => {
  if (!message.content.startsWith(client.prefix) || message.author.bot) return;

  // Isolates arguments in quotation marks as one argument while allowing escaping ( \" or \' )
  const args = message.content
    .slice(client.prefix.length)
    .trim()
    .match(/(?:[^\s"]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')+/g)
    .map(arg => arg.replace(/^['"]|['"]$/g, '')); // Removes surrounding quotes if present

  const commandName = args.shift().toLowerCase();

  // Find the command in the map
  const command = client.commands.get(commandName);

  if (!command) return; // Command doesn't exist

  try {
    await command.execute(message, args);  // Execute the command
  } catch (error) {
    console.error(error);
    message.channel.send('There was an error executing the command!');
  }
});

// Send captchas
client.on('guildMemberAdd', async (member) => {
  if (process.env.ENABLE_ANTI_BOT === "1" && process.env.NEW_USER_MSG !== "") {
    try {
      await member.send(process.env.NEW_USER_MSG);
      await member.send("Please complete the following captcha:");

      const attachment = new AttachmentBuilder(await getCaptchaImage(captchaForUser(member.id)), { name: 'captcha.png' });
      await member.send({ files: [attachment] });
    } catch (error) {
      console.error('Error sending captcha to new member:', error);
    }
  }
});

// Log deleted messages
client.on('messageDelete', async (message) => {
  if (process.env.ENABLE_DELETE_LOG === "1") {
    try {
      const reportChannel = message.guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
      if (reportChannel && message.channel.id !== reportChannel.id) {
        const msg = `new message deleted: ${message.content} - ${message.author}`;
        await reportChannel.send(msg);
      }
    } catch (error) {
      console.error('Error logging deleted message:', error);
    }
  }
});

client.login(TOKEN);