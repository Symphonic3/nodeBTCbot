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
    return message.reply("HEAD log does not exist or cannot be read.");
  }

  const botUrl = `https://github.com/Symphonic3/nodeBTCbot/commit/${headHash}`;

  try {
    await axios.get(botUrl); // We only care if it's 200
    return message.reply(`Bot version: <${botUrl}>`);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return message.reply(`HEAD is not pushed to remote. Hash: ${headHash}`);
    }
    return message.reply(`Error checking commit: ${err.message}`);
  }
}

module.exports = {
  version: {
    execute: versionCommand
  }
}