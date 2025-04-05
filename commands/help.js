/**
 * Lists all the commands the bot accepts.
 */
// eslint-disable-next-line no-unused-vars
function helpCommand(message, args) {
  // Get all the command names from the Map.
  const commandNames = Array.from(message.client.commands.keys());

  // Format the list into a single string.
  const commandList = commandNames.map(command => `${message.client.prefix + command}`).join(", ");

  // Send the list of commands with the bot support info.
  message.reply(`Commands this bot accepts: ${commandList}. For bot support inquire at <http://bitcointech.help/> or in the issues at <https://github.com/Symphonic3/nodeBTCbot/issues>`);
}

module.exports = {
  help: {
    execute: helpCommand
  }
}