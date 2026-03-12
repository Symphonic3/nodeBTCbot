const axios = require('axios');

const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

function normalizeMeaning(meaning) {
  const partOfSpeech = String(meaning?.partOfSpeech || '').trim();
  const definitions = Array.isArray(meaning?.definitions)
    ? meaning.definitions
      .map(definition => String(definition?.definition || '').trim())
      .filter(Boolean)
    : [];

  return {
    partOfSpeech,
    definitions
  };
}

async function getMeanings(term) {
  const normalizedTerm = String(term || '').trim();
  if (!normalizedTerm)
    return [];

  try {
    const response = await axios.get(`${DICTIONARY_API_URL}${encodeURIComponent(normalizedTerm)}`);
    const entries = Array.isArray(response.data) ? response.data : [];

    return entries
      .flatMap(entry => Array.isArray(entry?.meanings) ? entry.meanings : [])
      .map(normalizeMeaning)
      .filter(meaning => meaning.definitions.length > 0);
  } catch (error) {
    if (error.response?.status === 404)
      return [];

    throw new Error('Failed to fetch meanings.');
  }
}

module.exports = {
  getMeanings
};
