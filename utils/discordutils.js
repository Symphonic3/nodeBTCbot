// eslint-disable-next-line no-unused-vars
const { Message } = require('discord.js');
const { getAsDurationMs } = require('./utils');

const editDataRoles = process.env.EDIT_DATA_ROLES;
const modRole = process.env.MOD_ROLE;

/**
 * Checks if the author of this messsage has permission to edit data,
 * and sends an error reply if the user does not.
 * @param {Message} message 
 */
async function checkDataEdit(message) {
  const hasPermission = message.member?.roles?.cache?.some(role => editDataRoles.includes(role.id));

  if (!hasPermission) {
    // No permission to proceed
    await message.channel.send("No permission to use this command.");
  }

  return hasPermission;
}

/**
 * Checks if the author of this messsage is a mod,
 * and sends an error reply if the user does not.
 * @param {Message} message 
 */
async function checkMod(message) {
  const hasPermission = message.member?.roles?.cache?.some(role => role.name === modRole);

  if (!hasPermission) {
    // No permission to proceed
    await message.channel.send("No permission to use this command.");
  }

  return hasPermission;
}

/**
 * Extracts all mentions and user ids present in a message as members.
 * If a user id is not a member, they do not return.
 * @param {Message} message 
 * @param {string[]} args
 */
async function extractMembers(message, args) {
  const members = [...message.mentions.members.values()];

  // For each arg, try to extract a numeric user ID
  for (const arg of args) {
    // Look for a numeric ID in the argument
    const match = matchSnowflake(arg);
    if (match) {
      const userId = match[1];
      try {
        // Fetch the member from the guild
        const member = await message.guild.members.fetch(userId).catch(() => null);
        if (member)
          members.push(member);
      } catch (err) {
        console.error(`Error fetching user with ID ${userId}: ${err}`);
      }
    }
  }

  return members;
}

/**
 * Extracts all mentions and user ids present in a message as user ids.
 * Returns potential ids for members that are not in the server.
 * @param {Message} message 
 * @param {string[]} args
 */
async function extractIds(message, args) {
  const ids = [...message.mentions.members.values()].map(member => member.id);

  // For each arg, try to extract a numeric user ID
  for (const arg of args) {
    // Look for a numeric ID in the argument
    const match = matchSnowflake(arg);
    if (match) {
      const userId = match[1];
      ids.push(userId);
    }
  }

  return ids;
}

function matchSnowflake(str) {
  return str.match(/^(\d{17,19})$/);
}

function matchSnowflakeOrPing(str) {
  return str.match(/(\d{17,19})/);
}

function extractReason(args) {
  return args.filter(arg => !matchSnowflakeOrPing(arg)).join(" ");
}

function extractReasonWithoutDuration(args) {
  return args.filter(arg => !matchSnowflakeOrPing(arg)).slice(1).join(" ");
}

function extractDuration(args) {
  return getAsDurationMs(args.filter(arg => !matchSnowflakeOrPing(arg))[0]);
}

class Reason {
  constructor(userId, action, reason, mod) {
    this.userId = userId;
    this.action = action;
    this.reason = reason;
    this.mod = mod;
  }

  forReports() {
    let str = `${this.action} <@${this.userId}> `;
    if (this.reason)
      str = str + "| " + this.reason + " ";
    if (this.mod) 
      str = str + ">> " + this.mod;
    return str;
  }

  forModlog() {
    let str = `${this.action} `;
    if (this.reason)
      str = str + "| " + this.reason + " ";
    if (this.mod) 
      str = str + ">> " + this.mod;
    return str;
  }

  forInPlace() {
    let str = `${this.action} <@${this.userId}>`;
    if (this.reason)
      str = str + " | " + this.reason;
    return str;
  }

  forDiscord() {
    if (!this.reason && !this.mod)
      return null;
    let str = this.reason ? this.reason + " " : "";
    if (this.mod)
      str = str + ">> " + this.mod;
    return str;
  }
}

module.exports = { checkDataEdit, checkMod, extractMembers, extractIds, extractReason, extractDuration, extractReasonWithoutDuration, Reason }