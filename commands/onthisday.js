const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

// eslint-disable-next-line no-unused-vars
async function onthisdayCommand(message, args) {
  const api = `https://api.github.com/repos/coinkite/bitcoin.holiday.pub/contents/events`;

  const blacklist = [
    "2013-07-03-shitcoin-day.md",
    "2016-11-15-bitconnect.md",
    "2017-05-10-first-lightning-payment-on-ltc.md"
  ];

  let data;
  try {
    const response = await axios.get(api);
    data = response.data;
  } catch {
    return await message.channel.send("Error fetching data.");
  }

  data = data.filter(file => !blacklist.includes(file.name));

  const files = {};
  for (const file of data) {
    files[file.name] = file;
  }

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const re = /^\d+-(\d+)-(\d+).*\.md$/;
  
  const names = data.map(file => file.name.match(re)).filter(match => match !== null);
  const eventFilenames = names.filter(match => match[1] == month && match[2] == day).map(match => match[0]);

  if (eventFilenames.length > 0) {
    for (const eventFilename of eventFilenames) {
      //today is a bitcoin day
      let event;
      try {
        const response = await axios.get(files[eventFilename].download_url);
        event = response.data;
      } catch {
        return await message.channel.send("Error fetching data.");
      }
      const yamlInfo = event.split("---")[1];
      const info = parseYamlKV(yamlInfo);
      const html = event.split("---")[2];
      const embed = new EmbedBuilder()
        .setAuthor({ name: new Date(info.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) })
        .setTitle(info.title)
        .setDescription(htmlToDiscordDescription(html))
        .setColor(0xF7931A)
        .setTimestamp(message.createdAt);

      if (info.img)
        embed.setImage(files[info.img].download_url);

      await message.channel.send({ embeds: [embed] });
    }
  } else {
    await message.channel.send("Today is not a bitcoin holiday. View the full calendar at https://bitcoin.holiday/.");
  }
}

function htmlToDiscordDescription(html) {
  let output = html;

  // Convert <br> to newlines
  output = output.replace(/<br\s*\/?>/gi, '\n');

  // Convert <a href="...">text</a> to Markdown links
  output = output.replace(
    /<a\s+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi,
    '[$2]($1)'
  );

  // Remove all remaining HTML tags
  output = output.replace(/<\/?[^>]+>/gi, '');

  // Normalize spacing
  output = output
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return output;
}

function parseYamlKV(input) {
  const result = {};

  for (const line of input.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) {
      continue;
    }

    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();

    result[key] = value;
  }

  return result;
}

module.exports = {
  holiday: {
    execute: onthisdayCommand
  },
  today: {
    execute: onthisdayCommand
  },  
  onthisday: {
    execute: onthisdayCommand
  }
};