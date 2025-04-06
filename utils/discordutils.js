// eslint-disable-next-line no-unused-vars
const { Message } = require('discord.js');

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

module.exports = { checkDataEdit, checkMod }