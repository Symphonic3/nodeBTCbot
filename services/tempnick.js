const { Reason } = require("../utils/discordutils");
const { save, load } = require("../utils/utils");
const { modLogAdd } = require("./moderation");

const FILEPATH = "./data/tempnicks.json";
const TEMPNICKS = load(FILEPATH);
const _timeouts = {};

/**
 * @returns true if the user can change their nick, otherwise false.
 */
function canUserUpdateNickname(member, newNick) {
  return !TEMPNICKS[member.guild.id][member.user.id] 
    || TEMPNICKS[member.guild.id][member.user.id].nick === newNick;
}

const truncate = (str, maxLength) => 
  str.length > maxLength ? str.slice(0, maxLength) : str;

async function tempnick(guild, userId, duration, message, _reason, nick) {
  if (TEMPNICKS[guild.id][userId])
    return;

  const date = Date.now();
  const expiry = date + duration;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member)
    return;

  if (_timeouts[guild.id][userId]) {
    clearTimeout(_timeouts[guild.id][userId]);
    delete _timeouts[guild.id][userId];
  }

  _timeouts[guild.id][userId] = setTimeout(() => {
    try {
      unnick(guild, userId, null, "auto");
      // eslint-disable-next-line no-empty
    } catch {}
  }, duration);

  TEMPNICKS[guild.id][userId] = { nick, expiry };
  save(TEMPNICKS, FILEPATH);
 
  try {
    await member.setNickname(truncate(nick, 32));
  } catch {
    return;
  }

  const reportChannel = guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
  const reason = new Reason(userId, ":clown: **Tempnick**", _reason, message?.author.tag);
  if (reportChannel)
    await reportChannel.send(reason.forReports());

  modLogAdd(userId, reason.forModlog(), true);

  if (message)
    await message.channel.send(reason.forInPlace());
}

async function unnick(guild, userId, message, _reason) {
  if (!TEMPNICKS[guild.id][userId])
    return;

  if (_timeouts[guild.id][userId]) {
    clearTimeout(_timeouts[guild.id][userId]);
    delete _timeouts[guild.id][userId];
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member)
    return;

  delete TEMPNICKS[guild.id][userId];
  save(TEMPNICKS, FILEPATH);

  try {
    await member.setNickname(null);
  } catch {
    return;
  }

  const reportChannel = guild.channels.cache.find(channel => channel.name === process.env.REPORT_CHANNEL);
  const reason = new Reason(userId, ":person_gesturing_ok: **Untempnick**", _reason, message?.author.tag);
  if (reportChannel)
    await reportChannel.send(reason.forReports());

  modLogAdd(userId, reason.forModlog(), true);

  if (message)
    await message.channel.send(reason.forInPlace());
}

function initNicks(guild) {
  if (!TEMPNICKS[guild.id])
    TEMPNICKS[guild.id] = {};
  _timeouts[guild.id] = {};

  const date = Date.now();

  for (const userId of Object.keys(TEMPNICKS[guild.id])) {
    const { expiry } = TEMPNICKS[guild.id][userId];
    if (date <= expiry) {
      _timeouts[guild.id][userId] = setTimeout(() => {
        try {
          unnick(guild, userId, null, "auto");
        // eslint-disable-next-line no-empty
        } catch {}
      }, expiry - date);
    } else {
      try {
        unnick(guild, userId, null, "auto");
      // eslint-disable-next-line no-empty
      } catch {}
    }
  }
}

module.exports = { tempnick, unnick, initNicks, canUserUpdateNickname }