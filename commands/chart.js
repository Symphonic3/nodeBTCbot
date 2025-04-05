const { AttachmentBuilder } = require('discord.js');
const { CHART_TYPES, getChart } = require('../services/chart');

async function chartCommand(message, args) {
  // Ensure there are exactly two arguments
  if (args.length < 1 || args.length > 2) {
    return message.channel.send(`Please use the chart command in the format \`!chart chartname timespan\` where chartname is one of:\n\`\`\n${CHART_TYPES.join(', ')}\n\`\`\nand timespan is in the format #days, #weeks, #months, #years, etc. Example: \`!chart median-confirmation-time 10weeks\``);
  }

  const name = args[0].toLowerCase();
  const timespan = args[1] || "10weeks";

  // Check if the chart name is valid
  if (!CHART_TYPES.includes(name)) {
    await message.channel.send('Invalid chart name. Please ensure you are using a valid chart name from the list.');
    return;
  }

  try {
    // Assuming api.getChart returns a Promise and file is the result
    const chart = await getChart(name, timespan);

    // Handle error if the chart creation failed
    if (chart === null) {
      await message.channel.send(`There was an error creating your chart. Make sure your chart name was correct and your timespan had no spaces. Example: \`!chart median-confirmation-time 10weeks\``);
      return;
    }

    // Send the file as an attachment
    const attachment = new AttachmentBuilder(chart, { name: 'chart.png' });
    return message.channel.send({ files: [attachment] });

  } catch (error) {
    console.error(error);
    await message.channel.send('An unexpected error occurred while generating your chart.');
  }
}

module.exports = {
  chart: {
    execute: chartCommand
  }
}
