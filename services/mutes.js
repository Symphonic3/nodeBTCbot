const { Reason } = require("../utils/discordutils");
const { createSavable } = require("../utils/utils");
const { logMod } = require("./moderation");

const MUTES = createSavable("./data/mutes.json");
const _timeouts = {};

async function mute(guild, userId, duration, message, _reason) {
  if (MUTES[guild.id][userId])
    return;

  const date = Date.now();
  const expiry = date + duration;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member)
    return;

  try {
    const role = guild.roles?.cache?.get(process.env.MUTED_ROLE);
    if (!role) return;
    await member.roles.add(role);
  } catch {
    return;
  }

  if (_timeouts[guild.id][userId]) {
    clearTimeout(_timeouts[guild.id][userId]);
    delete _timeouts[guild.id][userId];
  }

  _timeouts[guild.id][userId] = setTimeout(() => {
    try {
      unmute(guild, userId, null, "automatic unmute");
    // eslint-disable-next-line no-empty
    } catch {}
  }, duration);

  MUTES[guild.id][userId] = expiry;
  MUTES.save();

  const reportChannel = guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
  const reason = new Reason(userId, ":mute: **Mute**", _reason, message?.author.tag);
  if (reportChannel)
    await reportChannel.send(reason.forReports());

  logMod(userId, reason.forModlog(), true);

  if (message)
    await message.channel.send(reason.forInPlace());
}

async function unmute(guild, userId, message, _reason) {
  if (!MUTES[guild.id][userId])
    return;

  if (_timeouts[guild.id][userId]) {
    clearTimeout(_timeouts[guild.id][userId]);
    delete _timeouts[guild.id][userId];
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member)
    return;

  try {
    const role = guild.roles?.cache?.get(process.env.MUTED_ROLE);
    if (!role) return;
    await member.roles.remove(role);
  } catch {
    return;
  }

  delete MUTES[guild.id][userId];
  MUTES.save();

  const reportChannel = guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
  const reason = new Reason(userId, ":loud_sound: **Unmute**", _reason, message?.author.tag);
  if (reportChannel)
    await reportChannel.send(reason.forReports());

  logMod(userId, reason.forModlog(), true);

  if (message)
    await message.channel.send(reason.forInPlace());
}

function initMutes(guild) {
  if (!MUTES[guild.id])
    MUTES[guild.id] = {};
  _timeouts[guild.id] = {};

  const date = Date.now();

  for (const userId of Object.keys(MUTES[guild.id])) {
    const expiry = MUTES[guild.id][userId];
    if (date <= expiry) {
      _timeouts[guild.id][userId] = setTimeout(() => {
        try {
          unmute(guild, userId, null, "automatic unmute");
        // eslint-disable-next-line no-empty
        } catch {}
      }, expiry - date);
    } else {
      try {
        unmute(guild, userId, null, "automatic unmute");
      // eslint-disable-next-line no-empty
      } catch {}
    }
  }
}

module.exports = { mute, unmute, initMutes }