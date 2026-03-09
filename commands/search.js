const { searchResources } = require('../services/resourcesearch');

function truncateText(text, maxLength = 120) {
  if (!text)
    return '';

  const normalized = String(text).replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength)
    return normalized;

  return normalized.slice(0, maxLength - 3) + '...';
}

async function searchCommand(message, args) {
  const query = args.join(' ').trim();

  if (!query) {
    await message.channel.send(`Please provide a search query. Example: \`${message.client.prefix}search knots\``);
    return;
  }

  const results = await searchResources(query, 3);

  if (results === null) {
    await message.channel.send('Unable to fetch resource index right now. Please try again later.');
    return;
  }

  if (results.length === 0) {
    await message.channel.send(`No results found for "${query}".`);
    return;
  }

  const lines = [`Top ${results.length} result(s) for **${query}**:`];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const name = result.name || 'Untitled resource';
    const category = result.category || result.categoryHeader || 'Uncategorized';
    const linkedName = result.url ? `[${name}](<${result.url}>)` : name;
    const summary = truncateText(result.externalSummary || result.content || '');

    lines.push(`${i + 1}. ${linkedName} (${category})`);
    if (summary)
      lines.push(`   ${summary}`);
  }

  await message.channel.send(lines.join('\n'));
}

module.exports = {
  search: {
    execute: searchCommand
  },
  s: {
    execute: searchCommand
  }
};