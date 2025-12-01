const { mute, unmute } = require("../services/mutes");
const { extractIds, extractReason, checkMod, extractDuration, extractReasonWithoutDuration } = require("../utils/discordutils");

async function muteCommand(message, args) {
  if (!await checkMod(message)) return;

  const ids = await extractIds(message, args);
  if (ids.length == 0)
    return await message.channel.send("Specify user(s).");

  const duration = extractDuration(args);
  const _reason = `Expires <t:${Math.round((Date.now() + duration) / 1000)}:R> | ${extractReasonWithoutDuration(args)}`;

  for (const userId of ids) {
    await mute(message.guild, userId, duration, message, _reason);
  }
}

async function unmuteCommand(message, args) {
  if (!await checkMod(message)) return;

  const ids = await extractIds(message, args);
  if (ids.length == 0)
    return await message.channel.send("Specify user(s).");

  const _reason = extractReason(args);

  for (const userId of ids) {
    await unmute(message.guild, userId, message, _reason);
  }
}

module.exports = {
  mute: {
    execute: muteCommand
  },
  tempmute: {
    execute: muteCommand
  },
  unmute: {
    execute: unmuteCommand
  }
}