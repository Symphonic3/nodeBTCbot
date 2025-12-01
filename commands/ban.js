const { logMod } = require("../services/moderation");
const { checkMod, extractIds, extractReason, Reason } = require("../utils/discordutils");

async function banCommand(message, args) {
  const action = ":hammer: **Ban**";
  if (!await checkMod(message)) return;

  let n = 0;

  const ids = await extractIds(message, args);
  if (ids.length == 0)
    return await message.channel.send("Specify user(s).");

  const _reason = extractReason(args);
  const reportChannel = message.guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);

  for (const userId of ids) {
    const reason = new Reason(userId, action, _reason, message.author.tag);
    try {
      // Fetch the member from the guild
      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (member?.roles?.cache?.some(role => role.name === process.env.MOD_ROLE)) {
        await message.channel.send("Can't ban mods");
      } else {
        await message.guild.members.ban(userId, {
          reason: reason.forDiscord(),
          deleteMessageSeconds: 0
        });
        if (reportChannel)
          await reportChannel.send(reason.forReports());
        if (ids.length <= 4)
          await message.channel.send(reason.forInPlace());
        logMod(userId, reason.forModlog(), false);
        n++;
      }
    } catch (err) {
      console.error(`Error banning user with ID ${userId}: ${err}`);
    }
  }

  if (ids.length > 1)
    await message.channel.send(`${n} users banned`);
}

// Not yet refactored to use extract methods or anything because I don't want to break it
async function banAfterCommand(message, args) {
  if (!await checkMod(message)) return;

  let n = 0;
  if (args.length < 1) {
    return await message.channel.send("Please provide at least a starting message ID.");
  }

  // Fetch start message and end message (if provided)
  let startMsg, endMsg;
  try {
    startMsg = await message.channel.messages.fetch(args[0]);
  } catch {
    return await message.channel.send("Could not fetch the starting message.");
  }
  
  // End time is now if no second argument is provided
  if (args.length < 2) {
    endMsg = { createdAt: new Date() };
  } else {
    try {
      endMsg = await message.channel.messages.fetch(args[1]);
    } catch  {
      return await message.channel.send("Could not fetch the ending message.");
    }
  }
  
  const startTime = startMsg.createdAt.getTime();
  const endTime = endMsg.createdAt.getTime();

  // Fetch messages from the channel history.
  // Note: Discord.js fetches in batches; here we fetch the most recent 100 messages
  // and then filter by timestamp. For a large date range, you'll need to loop over batches.
  const messages = await message.channel.messages.fetch({ limit: 100 });
  const messagesInRange = messages.filter(m => {
    const t = m.createdAt.getTime();
    return t >= startTime && t <= endTime;
  });

  // For each message in range, try to ban the author if they don't have the mod role.
  for (const msg of messagesInRange.values()) {
    // Skip messages without a guild member
    if (!msg.member) continue;
    if (msg.member.roles?.cache?.some(role => role.name === process.env.MOD_ROLE)) {
      await message.channel.send("Can't ban mods");
    } else {
      try {
        await message.guild.members.ban(msg.member.id);
        n++;
      } catch (err) {
        console.error(`Error banning ${msg.member.user.tag}: ${err}`);
      }
    }
  }

  await message.channel.send(`${n} users banned`);
}

module.exports = {
  ban: {
    execute: banCommand
  },
  banafter: {
    execute: banAfterCommand
  }
};
