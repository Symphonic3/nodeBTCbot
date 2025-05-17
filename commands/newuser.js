// eslint-disable-next-line no-unused-vars
async function welcomeNewUser(message, args) {
  let user = '';
  if (message.reference) {
    try {
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      user = `, ${repliedMsg.author}`;
    } catch (err) {
      console.error("Could not fetch replied message:", err);
    }
  }

  const rulesChannelId = process.env.RULES_CHANNEL;
  const welcomeText = `Welcome to our community Bitcoin chat${user}! Please review the <#${rulesChannelId}> while you're here; primarily no altcoin, stock, or off topic discussion. If you’re new to bitcoin, please check out https://btcmaxis.com/bitcoin.html, a community curated list of educational resources, tools, and information.`;

  await message.channel.send(welcomeText);
}

module.exports = {
  newuser: {
    execute: welcomeNewUser
  },
  welcome: {
    execute: welcomeNewUser
  }
};
