const { tempnick, unnick } = require("../services/tempnick");
const { extractIds, extractReason, checkMod, extractDuration, extractReasonWithoutDuration } = require("../utils/discordutils");

async function tempNickCommand(message, args) {
  if (!await checkMod(message)) return;

  const ids = await extractIds(message, args);
  if (ids.length == 0)
    return await message.channel.send("Specify user(s).");

  const duration = extractDuration(args);
  const nick = extractReasonWithoutDuration(args);
  const _reason = `Expires <t:${Math.round((Date.now() + duration) / 1000)}:R> | ${nick}`;

  for (const userId of ids) {
    await tempnick(message.guild, userId, duration, message, _reason, nick);
  }
}

async function unTempNickCommand(message, args) {
  if (!await checkMod(message)) return;

  const ids = await extractIds(message, args);
  if (ids.length == 0)
    return await message.channel.send("Specify user(s).");

  const _reason = extractReason(args);

  for (const userId of ids) {
    await unnick(message.guild, userId, message, _reason);
  }
}

module.exports = {
  tempnick: {
    execute: tempNickCommand
  },
  untempnick: {
    execute: unTempNickCommand
  },
  unnick: {
    execute: unTempNickCommand
  }
}