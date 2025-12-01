const { Client, GatewayIntentBits, Partials, Events, ActivityType, AttachmentBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const { formatCurrency, getBitcoinPriceUSD } = require('./services/yahoofinance');
const { getCaptchaImage, captchaForUser } = require('./services/captcha');
const { isMemo } = require('./services/memos');
const { initMutes } = require('./services/mutes');

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
  for (let guild of client.guilds.cache.values()) {
    initMutes(guild);
  }
  console.log(`✅ Logged in as ${client.user.tag}`);
  // Set an interval to update the bot's presence every 10 seconds
  setInterval(updatePresence, 10000);
});

// Respond to commands
client.on(Events.MessageCreate, async (message) => {
  if (!message.content.startsWith(client.prefix) || message.author.bot) return;

  // Isolates arguments in quotation marks as one argument while allowing escaping ( \" or \' )
  const preArgs = message.content
    .slice(client.prefix.length)
    .trim()
    .match(/(?:[^\s"]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')+/g);

  if (preArgs == null) return;

  const args = preArgs
    .map(arg => arg.replace(/^['"]|['"]$/g, '')); // Removes surrounding quotes if present

  const commandName = args.shift().toLowerCase();

  // Find the command in the map
  const command = client.commands.get(commandName);

  try {
    // Command doesn't exist, try a memo instead
    if (!command) {
      if (isMemo(commandName))
        await client.commands.get("memo").execute(message, [commandName]);
    } else {
      await command.execute(message, args);  // Execute the command
    }
  } catch (error) {
    console.error(error);
    message.channel.send('There was an error executing the command!');
  }
});

// Other message services
client.on('messageCreate', async (message) => {
  // Handle public channels
  if (message.channel.type !== ChannelType.DM) {
    if (message.channel.name === 'new-joins') {
      if (process.env.ENABLE_BAN_PATTERNS === '1') {
        const patterns = process.env.BAN_PATTERNS;
        for (let pattern of patterns) {
          const regex = new RegExp(pattern);
          if (regex.test(message.author.username)) {
            await message.channel.send(`banned ${message.author.username}`);
            await message.author.ban();
            return;
          }
        }
      }
    }

    // Remove blacklisted content
    if (process.env.ENABLE_BLACKLIST === '1') {
      if (!message.member?.roles?.cache?.some(role => role.name === process.env.MOD_ROLE) && message.author.id !== client.user.id) {
        const blacklist = process.env.BLACKLIST.split(',').filter(item => item);
        for (let item of blacklist) {
          if (message.content.toLowerCase().includes(item)) {
            console.log(`Deleting Message: ${message.author.username} ${message.author} - ${message.content}`);
            await message.delete();
            return;
          }
        }
      }
    }

    // Remove disallowed content from image-only channels
    if (process.env.ENABLE_IMAGEONLY === '1' && message.channel.name === process.env.IMAGEONLY_CHANNEL) {
      if (!message.member?.roles?.cache?.some(role => role.name === process.env.MOD_ROLE)) {
        if (message.content.includes('tenor.com') || message.content.includes('youtube.com') || message.content.includes('reddit.com') || message.content.includes('youtu.be.com')) {
          console.log('whitelist meme');
          return;
        } else {
          let imageFound = message.attachments.some(a => a.width);
          if (message.attachments.size < 1 || !imageFound) {
            await message.delete();
          }
        }
      }
    }

    // Remove stickers
    if (process.env.ENABLE_DELETE_STICKERS === '1' && message.stickers.size > 0) {
      await message.delete();
    }

    // Add easter eggs
    if (process.env.ENABLE_EASTER_EGG === '1' && message.content.includes(process.env.EASTER_EGG_TRIGGER)) {
      if (Math.random() * 100 <= parseInt(process.env.EASTER_EGG_PERCENT_CHANCE)) {
        await message.channel.send(process.env.EASTER_EGG);
      }
    }
  } else if (process.env.ENABLE_ANTI_BOT === '1' && message.author.id !== client.user.id) {
    // Handle DM's
    if (message.content.toUpperCase() === captchaForUser(message.author.id)) {
      for (let guild of client.guilds.cache.values()) {
        const role = guild.roles.cache.get(process.env.USER_ROLE);
        if (!role) {
          console.log(`Can't find role in ${guild.name}`);
          continue;
        }
        const member = guild.members.cache.get(message.author.id);
        await member.roles.add(role);
      }
      await message.channel.send('Thank you, welcome to the chat.');
    }
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
      if (message.content == null || message.guild == null)
        return;
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

// Track bans 
client.on('guildBanAdd', async (ban) => {
  try {
    const { guild, user } = ban;

    const logs = await guild.fetchAuditLogs({
      type: 22, // MEMBER_BAN_ADD
      limit: 1
    });

    const entry = logs.entries.first();

    const match =
      entry &&
      entry.target.id === user?.id &&
      Date.now() - entry.createdTimestamp < 5000;

    const reason = match ? entry.reason : null;
    const mod = match ? entry.executor : 'Unknown mod';
    let msg = `:man_police_officer: **Ban:** ${user?.tag} `;
    if (reason) {
      msg = msg + "| " + reason + " ";
    }
    msg = msg + `>> ${mod.tag}`;

    const reportChannel = guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
    if (reportChannel) {
      await reportChannel.send(msg);
    }
  } catch (error) {
    console.error('Error logging ban:', error);
  }
});

client.on('guildBanRemove', async (ban) => {
  try {
    const { guild, user } = ban;

    const logs = await guild.fetchAuditLogs({
      type: 23, // MEMBER_BAN_REMOVE
      limit: 1
    });

    const entry = logs.entries.first();

    const match =
      entry &&
      entry.target.id === user?.id &&
      Date.now() - entry.createdTimestamp < 5000;

    const reason = match ? entry.reason : null;
    const mod = match ? entry.executor : 'Unknown mod';
    let msg = `:repeat: **Unban:** ${user?.tag} `;
    if (reason) {
      msg = msg + "| " + reason + " ";
    }
    msg = msg + `>> ${mod.tag}`;

    const reportChannel = guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
    if (reportChannel) {
      await reportChannel.send(msg);
    }
  } catch (error) {
    console.error('Error logging ban:', error);
  }
});

client.login(TOKEN);
