const { logMod } = require("../services/moderation");
const { extractIds, extractReason, checkMod, Reason } = require("../utils/discordutils");

async function unban(message, args) {
  const action = ":angel: **Unban**";
  if (!await checkMod(message)) return;

  const ids = await extractIds(message, args);
  if (ids.length != 1) {
    return await message.channel.send("Specify 1 user.");
  }

  const reason = new Reason(ids[0], action, extractReason(args), message.author.tag);
  const reportChannel = message.guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
  if (reportChannel) {
    await reportChannel.send(reason.forReports());
  }

  await message.guild.bans.remove(ids[0], reason.forDiscord());
  logMod(ids[0], reason.forModlog(), true);

  await message.channel.send(reason.forInPlace());
}

module.exports = {
  unban: {
    execute: unban
  }
}