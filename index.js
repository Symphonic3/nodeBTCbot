const { Client, GatewayIntentBits, Partials, Events, ActivityType, AttachmentBuilder, ChannelType, EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const { formatCurrency, getBitcoinPriceUSD } = require('./services/yahoofinance');
const { getCaptchaImage, captchaForUser } = require('./services/captcha');
const { isMemo } = require('./services/memos');
const { initMutes } = require('./services/mutes');
const { Reason } = require('./utils/discordutils');
const { modLogAdd } = require('./services/moderation');
const { initNicks, canUserUpdateNickname } = require('./services/tempnick');

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
    initNicks(guild);
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

/**
 * Attempts to find an audit log entry for an event that just occured.
 * This function is slow and tries multiple times to catch the event.
 * @param {AuditLogEvent} type 
 * @param {(entry: GuildAuditLogsEntry) => boolean} predicate 
 */
async function getRecentlyCreatedAuditLogFor(guild, type, predicate) {
  let backoff = 200;
  for (let i = 0; i < 3; i++) {
    const logs = await guild.fetchAuditLogs({
      type,
      limit: 10
    });

    const match = logs.entries.find(
      entry => Date.now() - entry.createdTimestamp < 3000+backoff && predicate(entry));

    if (match)
      return match;

    await new Promise(resolve => setTimeout(resolve, backoff));
    backoff *= 2;
  }
  return null;
}

// Track bans 
client.on('guildBanAdd', async (ban) => {
  try {
    const { guild, user } = ban;

    const entry = await getRecentlyCreatedAuditLogFor(guild, AuditLogEvent.MemberBanAdd, 
      entry => entry.target.id === user?.id);

    const _reason = entry?.reason;
    const modTag = entry?.executor.tag ?? 'Unknown mod';
    const reason = new Reason(user.id, ":man_police_officer: **Ban**", _reason, modTag);

    const reportChannel = guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
    if (reportChannel) {
      await reportChannel.send(reason.forReports());
    }

    modLogAdd(user.id, reason.forModlog(), false);
  } catch (error) {
    console.error('Error logging ban:', error);
  }
});

client.on('guildBanRemove', async (ban) => {
  try {
    const { guild, user } = ban;

    const entry = await getRecentlyCreatedAuditLogFor(guild, AuditLogEvent.MemberBanRemove, 
      entry => entry.target.id === user?.id);

    const _reason = entry?.reason;
    const modTag = entry?.executor.tag ?? 'Unknown mod';
    const reason = new Reason(user.id, ":repeat: **Unban**", _reason, modTag);

    const reportChannel = guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
    if (reportChannel) {
      await reportChannel.send(reason.forReports());
    }

    modLogAdd(user.id, reason.forModlog(), true);
  } catch (error) {
    console.error('Error logging ban:', error);
  }
});

//track timeouts
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const guild = newMember.guild;

    if (newMember.communicationDisabledUntilTimestamp !== oldMember.communicationDisabledUntilTimestamp) {
      //timeout changes
      
      const entry = await getRecentlyCreatedAuditLogFor(guild, AuditLogEvent.MemberUpdate, 
        entry => entry.target.id === newMember?.id);
      
      const info = newMember.communicationDisabledUntilTimestamp ? `Expires <t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:R>` : `Removed`;
      
      let _reason = entry?.reason;
      _reason = _reason ? _reason + " | " + info : info;
      const modTag = entry?.executor.tag ?? 'Unknown mod';
      const reason = new Reason(newMember.user.id, ":hourglass: **Timeout**", _reason, modTag);
      
      const reportChannel = guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
      if (reportChannel) {
        await reportChannel.send(reason.forReports());
      }
      
      modLogAdd(newMember.user.id, reason.forModlog(), true);
    }

    if (newMember.nickname !== oldMember.nickname) {
      //nickname changes

      if (!canUserUpdateNickname(newMember, newMember.nickname)) {
        await newMember.setNickname(oldMember.nickname);
      }
    }
  } catch (error) {
    console.error('Error logging member update:', error);
  }
});

const STAR_EMOJI = "⭐";
const STAR_ACKNOWLEDGE_EMOJI = "🌟";
const STAR_THRESHOLD = 2;

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (user.bot)
      return;

    if (reaction.emoji.name !== STAR_EMOJI)
      return;

    let message = reaction.message;

    if (!message.guild)
      return;

    if (!message.content) {
      //We are dealing with an uncached message
      message = await message.channel.messages.fetch(message.id);
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member)
      return;

    //only approved users contribute to starboarding, otherwise disallow star reactions
    if (member?.roles?.cache?.some(role => process.env.EDIT_DATA_ROLES.includes(role.id))) {
      await reaction.users.fetch(); //This becomes necessary for some reason if the message was not cached
      if (reaction.users.cache.size < STAR_THRESHOLD)
        return;

      const ackReaction = message.reactions.cache?.get(STAR_ACKNOWLEDGE_EMOJI);

      if (ackReaction?.users.cache?.has(client.user.id)) //the bot has already starboarded this msg
        return;

      await message.react(STAR_ACKNOWLEDGE_EMOJI);

      const starboardChannel = message.guild.channels.cache.find(channel => channel.id === process.env.STARBOARD_CHANNEL);
      if (starboardChannel) {
        const embed = new EmbedBuilder()
          .setAuthor({
            name: message.author.tag,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(message.content || "*No text content*")
          .setColor(0xF7931A)
          .setTimestamp(message.createdAt)
          .addFields({
            name: "Jump to message",
            value: `[Click here](${message.url})`
          });

        const attachments = Array.from(message.attachments.values());

        if (attachments.length > 0) {
          embed.setImage(attachments[0].url);

          if (attachments.length > 1) {
            embed.addFields({
              name: "Attachments",
              value: attachments
                .map(a => `[${a.name}](${a.url})`)
                .join("\n")
            });
          }
        }

        await starboardChannel.send({
          content: `⭐ **${reaction.users.cache.size}** | <#${message.channel.id}>`,
          embeds: [embed]
        });
      }
    } else {
      await reaction.users.remove(user.id);
    }
  } catch (error) {
    console.error('Error processing reactions:', error);
  }
});

client.login(TOKEN);
