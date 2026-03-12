const { getMeanings } = require('../services/dictionary');

const MAX_MEANINGS = 8;
const MAX_DEFINITIONS_PER_MEANING = 3;
const MAX_MESSAGE_LENGTH = 1900;

function summarizeMeaning(meaning) {
  const definitions = meaning.definitions.slice(0, MAX_DEFINITIONS_PER_MEANING);
  if (!definitions.length)
    return null;

  const partOfSpeech = meaning.partOfSpeech ? `${meaning.partOfSpeech}: ` : '';
  return `${partOfSpeech}${definitions.join(' | ')}`;
}

function buildMeaningsMessage(term, meanings) {
  const summaries = meanings
    .map(summarizeMeaning)
    .filter(Boolean)
    .slice(0, MAX_MEANINGS);

  const lines = [`Meanings for **${term}**:`];
  let added = 0;

  for (let i = 0; i < summaries.length; i++) {
    const candidateLine = `${i + 1}. ${summaries[i]}`;
    const preview = `${lines.join('\n')}\n${candidateLine}`;

    if (preview.length > MAX_MESSAGE_LENGTH)
      break;

    lines.push(candidateLine);
    added++;
  }

  const hiddenCount = Math.max(0, summaries.length - added) + Math.max(0, meanings.length - MAX_MEANINGS);
  if (hiddenCount > 0)
    lines.push(`...and ${hiddenCount} more meaning(s).`);

  return lines.join('\n');
}

async function defineCommand(message, args) {
  const term = args.join(' ').trim();

  if (!term) {
    await message.channel.send(`Please provide a term. Example: \`${message.client.prefix}define bitcoin\``);
    return;
  }

  let meanings;
  try {
    meanings = await getMeanings(term);
  } catch {
    await message.channel.send('Unable to fetch definitions right now. Please try again later.');
    return;
  }

  if (meanings.length === 0) {
    await message.channel.send(`No meanings found for **${term}**.`);
    return;
  }

  await message.channel.send(buildMeaningsMessage(term, meanings));
}

module.exports = {
  define: {
    execute: defineCommand
  },
  def: {
    execute: defineCommand
  }
};
