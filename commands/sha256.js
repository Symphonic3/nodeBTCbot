const crypto = require('crypto');

/**
 * Converts a binary string (composed of 0's and 1's) into a hexadecimal string.
 * Assumes the binary string’s length is a multiple of 4.
 *
 * @param {string} binStr - The binary string.
 * @returns {string} The corresponding hexadecimal string.
 */
function binToHex(binStr) {
  let hex = '';
  for (let i = 0; i < binStr.length; i += 4) {
    const nibble = binStr.substr(i, 4);
    // Convert each 4-bit chunk into a hex digit.
    const hexDigit = parseInt(nibble, 2).toString(16);
    hex += hexDigit;
  }
  return hex;
}

/**
 * Implements the sha256 command.
 * Usage: !sha256 <ENT> <base> <entropy>
 * - ENT must be one of: "128", "160", "192", "224", "256"
 * - base must be "b" (binary) or "h" (hexadecimal)
 *
 * @param {Message} message - The Discord.js message object.
 * @param {string[]} args - The command arguments.
 * @returns {Promise<Message|void>} The sent message promise.
 */
function sha256Command(message, args) {
  // Check if the help message should be sent.
  if (args.length === 0 || args[0] === "help" || args.length < 3) {
    return message.channel.send(
      "To use sha256 use the format: `!sha256 <ENT> <base> <entropy>` where base is b (binary) or h (hexadecimal) and ENT is 128, 160, 192, 224, or 256"
    );
  }

  const supportedEntropy = ["128", "160", "192", "224", "256"];
  const supportedBase = ["b", "h"];
  const [ENT, BASE, ENTROPY] = args;

  if (!supportedBase.includes(BASE)) {
    return message.channel.send("base must be b (binary) or h (hexadecimal)");
  }
  if (!supportedEntropy.includes(ENT)) {
    return message.channel.send("entropy must be 128, 160, 192, 224, or 256");
  }

  try {
    if (BASE === "b") {
      // For binary base, the ENTROPY string length must match ENT bits.
      if (ENTROPY.length !== parseInt(ENT)) {
        return message.channel.send(`entropy length must be ${ENT}`);
      }
      // Convert the binary string to hexadecimal.
      const hexEntropy = binToHex(ENTROPY);
      const hash = crypto
        .createHash('sha256')
        .update(Buffer.from(hexEntropy, 'hex'))
        .digest('hex');
      return message.channel.send("0x" + hash);
    } else {
      // For hexadecimal base.
      const entInt = parseInt(ENT);
      // Each hexadecimal digit represents 4 bits.
      if (ENTROPY.length !== entInt / 4) {
        return message.channel.send("entropy length must be " + (entInt / 4));
      }
      const hash = crypto
        .createHash('sha256')
        .update(Buffer.from(ENTROPY, 'hex'))
        .digest('hex');
      return message.channel.send("0x" + hash);
    }
  } catch {
    return message.channel.send(`entropy must be a valid ${ENT} bit ${BASE} number`);
  }
}

module.exports = {
  sha256: {
    execute: sha256Command
  }
}
