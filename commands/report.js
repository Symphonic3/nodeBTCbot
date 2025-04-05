const { ChannelType } = require('discord.js');

async function handleReport(message, args) {
  if (process.env.ENABLE_REPORTS !== "1") return;

  const reportChannelName = process.env.REPORT_CHANNEL;
  const reportMessage = args.join(" ");
  const client = message.client;

  for (const guild of client.guilds.cache.values()) {
    const reportChannel = guild.channels.cache.find(
      channel => channel.name === reportChannelName && channel.type === ChannelType.GuildText
    );

    if (reportChannel) {
      let msg = `${message.author} reporting: ${reportMessage}`;

      if (message.reference) {
        try {
          const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
          msg += ` - ${referencedMessage.author}: ${referencedMessage.content} - ${referencedMessage.url}`;
        } catch (err) {
          console.error("Failed to fetch the referenced message:", err);
        }
      }

      await reportChannel.send(msg);
    }
  }

  try {
    await message.delete();
  } catch (err) {
    console.warn("Failed to delete report message:", err);
  }
}

module.exports = {
  report: {
    execute: handleReport
  }
};