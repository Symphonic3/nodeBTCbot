const axios = require('axios');
const { cachifyFunction } = require('../utils/utils');

const RESOURCE_INDEX_URL = 'https://raw.githubusercontent.com/MrRGnome/btc-resources/refs/heads/master/data/resource-index.json';
const RESOURCE_BASE_URL = 'https://btcmaxis.com/';
const QUERY_PIN_OVERRIDES = {
  knots: ['knotslies', 'knots lies']
};
const PIN_OVERRIDE_SCORE = 10000;

function normalizeText(value) {
  return String(value ?? '').toLowerCase().trim();
}

function sanitizeResourceUrl(url) {
  const raw = String(url ?? '').trim();

  if (!raw)
    return '';

  if (/^https?:\/\//i.test(raw))
    return raw;

  const relativePath = raw.replace(/^\/+/, '');
  return RESOURCE_BASE_URL + relativePath;
}

function buildSearchFields(resource) {
  const tags = Array.isArray(resource.tags) ? resource.tags : [];
  const keywords = Array.isArray(resource.externalKeywords) ? resource.externalKeywords : [];

  return {
    name: normalizeText(resource.name),
    url: normalizeText(sanitizeResourceUrl(resource.url)),
    content: normalizeText(resource.content),
    summary: normalizeText(resource.externalSummary),
    category: normalizeText(resource.category || resource.categoryHeader),
    page: normalizeText(resource.page),
    tags: tags.map(normalizeText),
    keywords: keywords.map(normalizeText),
  };
}

function hasPinOverrideMatch(fields, normalizedQuery) {
  const pins = QUERY_PIN_OVERRIDES[normalizedQuery];
  if (!pins || pins.length === 0)
    return false;

  const values = [
    fields.name,
    fields.url,
    fields.content,
    fields.summary,
    fields.category,
    fields.page,
    ...fields.tags,
    ...fields.keywords
  ];

  return pins.some(pin => values.some(value => value.includes(pin)));
}

function scoreResource(resource, normalizedQuery, queryTokens) {
  const fields = buildSearchFields(resource);
  const combinedFields = [
    fields.name,
    fields.url,
    fields.content,
    fields.summary,
    fields.category,
    fields.page,
    ...fields.tags,
    ...fields.keywords
  ];
  const fullText = combinedFields.join(' ');

  let score = 0;

  if (hasPinOverrideMatch(fields, normalizedQuery))
    score += PIN_OVERRIDE_SCORE;

  if (fields.name === normalizedQuery)
    score += 220;
  if (fields.url === normalizedQuery)
    score += 200;
  if (fields.tags.some(tag => tag === normalizedQuery))
    score += 180;
  if (fields.keywords.some(keyword => keyword === normalizedQuery))
    score += 160;

  if (fields.name.startsWith(normalizedQuery))
    score += 120;
  if (fields.tags.some(tag => tag.startsWith(normalizedQuery)))
    score += 95;

  if (fields.name.includes(normalizedQuery))
    score += 90;
  if (fields.content.includes(normalizedQuery))
    score += 80;
  if (fields.summary.includes(normalizedQuery))
    score += 70;
  if (fields.url.includes(normalizedQuery))
    score += 60;
  if (fields.tags.some(tag => tag.includes(normalizedQuery)))
    score += 55;
  if (fields.keywords.some(keyword => keyword.includes(normalizedQuery)))
    score += 45;
  if (fields.category.includes(normalizedQuery))
    score += 25;
  if (fields.page.includes(normalizedQuery))
    score += 20;

  if (queryTokens.length > 1) {
    let matchedTokenCount = 0;
    for (const token of queryTokens) {
      if (fullText.includes(token)) {
        matchedTokenCount++;
        score += 12;
      }
    }

    if (matchedTokenCount === queryTokens.length)
      score += 40;
  }

  return score;
}

async function fetchResourceIndex() {
  try {
    const response = await axios.get(RESOURCE_INDEX_URL);
    const resources = response?.data?.resources;
    if (!Array.isArray(resources))
      throw new Error('Invalid resource index payload.');

    return resources.map(resource => ({
      ...resource,
      url: sanitizeResourceUrl(resource.url)
    }));
  } catch (error) {
    console.error('Error fetching resource index:', error.message);
    return null;
  }
}

const getResourceIndex = cachifyFunction(fetchResourceIndex, 1000 * 60 * 5); // 5 minutes

async function searchResources(query, limit = 3) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery)
    return [];

  const queryTokens = normalizedQuery.split(/\s+/).filter(token => token.length > 0);
  const resources = await getResourceIndex();

  if (resources === null)
    return null;

  const ranked = [];

  for (const resource of resources) {
    const score = scoreResource(resource, normalizedQuery, queryTokens);
    if (score > 0)
      ranked.push({ resource, score });
  }

  ranked.sort((a, b) =>
    b.score - a.score ||
    String(a.resource.name || '').localeCompare(String(b.resource.name || ''))
  );

  return ranked.slice(0, limit).map(entry => entry.resource);
}

module.exports = { searchResources };