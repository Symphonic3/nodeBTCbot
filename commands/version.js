const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Reads the last commit hash from the .git/logs/HEAD file.
 * @returns {string|null} The commit hash or null if not readable.
 */
function getHeadHash() {
  const gitHistory = path.join('.git', 'logs', 'HEAD');
  try {
    const lines = fs.readFileSync(gitHistory, 'utf8').trim().split('\n');
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1].split(' ');
      return lastLine[1];
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Discord.js command handler for !version
 * @param {Message} message - The Discord message object.
 * @param {string[]} args - Command arguments (not used here).
 */
// eslint-disable-next-line no-unused-vars
async function versionCommand(message, args) {
  const headHash = getHeadHash();
  if (!headHash) {
    return await message.channel.send("HEAD log does not exist or cannot be read.");
  }

  const botUrl = `https://api.github.com/repos/Symphonic3/nodeBTCbot/compare/HEAD...${headHash}`;

  try {
    const response = await axios.get(botUrl);
    const data = response.data;

    let versionString = `Bot version: <https://github.com/Symphonic3/nodeBTCbot/commit/${headHash}>`;
    if (data.behind_by > 0) {
      versionString += `\n\n**The current running bot is behind main by ${data.behind_by} commit(s).**`;
    }
    if (data.behind_by >= 3) {
      versionString += `\nClearly we should fire whoever's in charge of maintaining this thing.`;
    }
    if (data.behind_by >= 5) {
      versionString += ` (the useless lawn decoration, of course.)`;
    }
    return await message.channel.send(versionString);
  } catch (err) {
    if (err.response?.status === 404) {
      return await message.channel.send(`Local HEAD is not pushed to remote. Hash: ${headHash}`);
    } else
      return await message.channel.send(`Error checking commit: ${err.message}`);
  }
}

module.exports = {
  version: {
    execute: versionCommand
  }
}