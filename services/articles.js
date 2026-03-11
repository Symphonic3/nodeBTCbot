const axios = require('axios');
const crypto = require('crypto');

function getConfig() {
  return {
    token: process.env.ARTICLES_GITHUB_TOKEN,
    owner: process.env.ARTICLES_GITHUB_OWNER,
    repo: process.env.ARTICLES_GITHUB_REPO,
    branch: process.env.ARTICLES_GITHUB_BRANCH,
    indexPath: process.env.ARTICLES_GITHUB_INDEX_PATH,
    articleDirectory: process.env.ARTICLES_GITHUB_ARTICLE_DIR
  };
}

function requireConfig() {
  const config = getConfig();
  const missing = [];

  if (!config.token) missing.push('ARTICLES_GITHUB_TOKEN');
  if (!config.owner) missing.push('ARTICLES_GITHUB_OWNER');
  if (!config.repo) missing.push('ARTICLES_GITHUB_REPO');
  if (!config.branch) missing.push('ARTICLES_GITHUB_BRANCH');
  if (!config.indexPath) missing.push('ARTICLES_GITHUB_INDEX_PATH');
  if (!config.articleDirectory) missing.push('ARTICLES_GITHUB_ARTICLE_DIR');

  if (missing.length > 0)
    throw new Error(`Missing GitHub article config: ${missing.join(', ')}`);

  return config;
}

function encodePath(rawPath) {
  return String(rawPath)
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

let articleWriteQueue = Promise.resolve();

function enqueueArticleWrite(task) {
  const queuedTask = articleWriteQueue.then(task, task);
  articleWriteQueue = queuedTask.catch(() => {});
  return queuedTask;
}

function toQualifiedBranchName(branch) {
  const normalized = String(branch || '').trim();
  if (!normalized)
    return normalized;

  if (normalized.startsWith('refs/heads/'))
    return normalized;

  return `refs/heads/${normalized}`;
}

function githubClient(config) {
  return axios.create({
    baseURL: 'https://api.github.com',
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'nodeBTCbot-articles'
    }
  });
}

function emptyIndex() {
  return {
    articles: {},
    updated_at: null
  };
}

function parseIndex(content) {
  if (!content)
    return emptyIndex();

  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object')
      return emptyIndex();

    if (!parsed.articles || typeof parsed.articles !== 'object' || Array.isArray(parsed.articles))
      parsed.articles = {};

    return parsed;
  } catch {
    return emptyIndex();
  }
}

function parseArticle(content) {
  if (!content)
    return null;

  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object')
      return null;

    return parsed;
  } catch {
    return null;
  }
}

function getErrorMessage(error) {
  const graphQlError = error?.response?.data?.errors?.[0]?.message;
  if (graphQlError)
    return graphQlError;

  const apiError = error?.response?.data?.message;
  if (apiError)
    return apiError;

  return error?.message || 'Unknown error';
}

function isHeadConflictMessage(message) {
  const normalized = String(message || '');
  return /expectedHeadOid|Head branch was modified|branch was modified|is at .* but expected/i.test(normalized);
}

async function commitFilesSingleApiCall(config, changes, headline, expectedHeadOid = null) {
  const client = githubClient(config);

  const query = `
    mutation CreateCommitOnBranch($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit {
          oid
        }
      }
    }
  `;

  const changeObject = Array.isArray(changes)
    ? { additions: changes }
    : (changes && typeof changes === 'object' ? changes : {});

  const additions = Array.isArray(changeObject.additions)
    ? changeObject.additions.map(file => ({
      path: file.path,
      contents: Buffer.from(String(file.content || ''), 'utf8').toString('base64')
    }))
    : [];

  const deletions = Array.isArray(changeObject.deletions)
    ? changeObject.deletions.map(file => ({
      path: String(file?.path || file || '')
    })).filter(file => file.path)
    : [];

  const fileChanges = {};
  if (additions.length > 0)
    fileChanges.additions = additions;

  if (deletions.length > 0)
    fileChanges.deletions = deletions;

  if (!fileChanges.additions && !fileChanges.deletions)
    throw new Error('No file changes were provided for commitFilesSingleApiCall.');

  const input = {
    branch: {
      repositoryNameWithOwner: `${config.owner}/${config.repo}`,
      branchName: toQualifiedBranchName(config.branch)
    },
    message: {
      headline
    },
    fileChanges
  };

  if (expectedHeadOid)
    input.expectedHeadOid = expectedHeadOid;

  const response = await client.post('/graphql', {
    query,
    variables: { input }
  });

  const errors = response.data?.errors;
  if (Array.isArray(errors) && errors.length > 0)
    throw new Error(errors[0].message || 'GraphQL createCommitOnBranch failed');

  const oid = response.data?.data?.createCommitOnBranch?.commit?.oid;
  if (!oid)
    throw new Error('GraphQL createCommitOnBranch did not return a commit oid');

  return oid;
}

async function getBranchHeadOid(config) {
  const client = githubClient(config);
  const encodedBranch = encodePath(config.branch);
  const response = await client.get(`/repos/${config.owner}/${config.repo}/git/ref/heads/${encodedBranch}`);
  return String(response.data?.object?.sha || '').trim() || null;
}

async function getRepoFile(config, filePath, ref = null) {
  const client = githubClient(config);
  const encodedPath = encodePath(filePath);

  try {
    const response = await client.get(`/repos/${config.owner}/${config.repo}/contents/${encodedPath}`, {
      params: { ref: ref || config.branch }
    });

    const base64Content = String(response.data.content || '').replace(/\n/g, '');
    const content = Buffer.from(base64Content, 'base64').toString('utf8');

    return {
      exists: true,
      sha: response.data.sha,
      content,
      path: response.data.path
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        exists: false,
        sha: null,
        content: null,
        path: filePath
      };
    }

    throw error;
  }
}

function toArticleFilename(config, article) {
  return `${config.articleDirectory}/${article.id}.json`;
}

function normalizeUniqueStrings(values) {
  if (!Array.isArray(values))
    return [];

  const unique = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized)
      continue;

    if (seen.has(normalized))
      continue;

    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}

function normalizeProfileObjects(values) {
  if (!Array.isArray(values))
    return [];

  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const username = String(value?.username || '').trim();
    if (!username)
      continue;

    const key = username.toLowerCase();
    if (seen.has(key))
      continue;

    seen.add(key);
    normalized.push({
      username,
      image: String(value?.image || '')
    });
  }

  return normalized;
}

function normalizeTagText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeHttpUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized)
    return '';

  return /^https?:\/\/\S+$/i.test(normalized) ? normalized : '';
}

function extractTaggableContent(content) {
  const raw = String(content || '').replace(/\r/g, '');
  const marker = 'full article here';
  const markerIndex = raw.toLowerCase().indexOf(marker);
  if (markerIndex < 0)
    return raw;

  const newlineAfterMarker = raw.indexOf('\n', markerIndex);
  if (newlineAfterMarker < 0)
    return '';

  return raw.slice(newlineAfterMarker + 1);
}

function stripUrlsAndQuotesForSummary(content) {
  const taggable = extractTaggableContent(content).replace(/\r/g, '');
  const withoutQuotes = taggable
    .split('\n')
    .map(line => String(line || '').trim())
    .filter(line => line && !line.startsWith('>'))
    .join('\n');

  return withoutQuotes
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1')
    .replace(/<?https?:\/\/\S+>?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractContentLines(content) {
  const normalizedContent = stripUrlsAndQuotesForSummary(content);
  const sentenceCandidates = normalizedContent
    .split(/(?<=[.!?])\s+/g)
    .map(normalizeTagText)
    .filter(sentence => sentence && /[a-z0-9]/i.test(sentence));

  const substantiveSentences = sentenceCandidates.filter(sentence => {
    const wordCount = (sentence.match(/[a-z0-9']+/gi) || []).length;
    return wordCount >= 4 && sentence.length >= 20;
  });

  const selected = substantiveSentences.length >= 2
    ? substantiveSentences
    : sentenceCandidates;

  return {
    line1: selected[0] || '',
    line2: selected[1] || ''
  };
}

function collectProfileTagNames(profiles) {
  if (!Array.isArray(profiles))
    return [];

  const names = [];
  const seen = new Set();

  for (const profile of profiles) {
    const username = normalizeTagText(profile?.username);
    if (!username)
      continue;

    const key = username.toLowerCase();
    if (seen.has(key))
      continue;

    seen.add(key);
    names.push(username);
  }

  return names;
}

function buildArticleTags(title, authors = [], contributors = [], articleId = null) {
  const normalizedTitle = normalizeTagText(title) || 'Untitled';
  const normalizedArticleId = normalizeTagText(articleId);

  const tags = [];
  const seen = new Set();
  const baseTags = [
    normalizedTitle,
    normalizedArticleId
  ];
  const nameTags = [
    ...collectProfileTagNames(authors),
    ...collectProfileTagNames(contributors)
  ];

  for (const rawTag of [...baseTags, ...nameTags]) {
    const tag = normalizeTagText(rawTag);
    if (!tag)
      continue;

    const key = tag.toLowerCase();
    if (seen.has(key))
      continue;

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

function normalizeArticleTags(article) {
  return buildArticleTags(
    article?.title,
    article?.authors,
    article?.contributors,
    article?.id
  );
}

function buildDraftArticlePayload(articleInput) {
  const authorObjects = normalizeProfileObjects(articleInput?.authors);

  if (authorObjects.length === 0) {
    authorObjects.push({
      username: String(articleInput?.author_username || 'Anonymous').trim() || 'Anonymous',
      image: String(articleInput?.author_image || '')
    });
  }

  const authorUsernameSet = new Set(authorObjects.map(author => author.username.toLowerCase()));
  const contributorObjects = normalizeProfileObjects(articleInput?.contributors)
    .filter(contributor => !authorUsernameSet.has(contributor.username.toLowerCase()));

  const articleId = String(articleInput?.id || crypto.randomUUID());
  const { line1, line2 } = extractContentLines(articleInput?.content);
  const tags = buildArticleTags(articleInput?.title, authorObjects, contributorObjects, articleId);
  const forumPostUrl = normalizeHttpUrl(articleInput?.forum_post_url);

  const article = {
    id: articleId,
    title: String(articleInput?.title || '').trim(),
    content: String(articleInput?.content || ''),
    article_time: articleInput?.article_time ? new Date(articleInput.article_time).toISOString() : new Date().toISOString(),
    published: false,
    authors: authorObjects,
    contributors: contributorObjects,
    line1,
    line2,
    tags,
    forum_post_url: forumPostUrl,
    source_message_id: String(articleInput?.source_message_id || ''),
    source_channel_id: String(articleInput?.source_channel_id || ''),
    source_guild_id: String(articleInput?.source_guild_id || ''),
    linked_message_ids: normalizeUniqueStrings(articleInput?.linked_message_ids)
  };

  if (!article.title)
    throw new Error('Article title is required');

  if (!article.content)
    throw new Error('Article content is required');

  return article;
}

function toIndexEntry(article, filename) {
  const primaryAuthor = normalizeTagText(article?.authors?.[0]?.username) || 'Anonymous';
  const derivedLines = extractContentLines(article?.content);
  const line1 = normalizeTagText(article?.line1) || derivedLines.line1;
  const line2 = normalizeTagText(article?.line2) || derivedLines.line2;
  const forumPostUrl = normalizeHttpUrl(article?.forum_post_url);

  return {
    filename,
    timestamp: article.article_time,
    title: String(article.title || ''),
    author: primaryAuthor,
    line1,
    line2,
    forum_post_url: forumPostUrl,
    tags: normalizeArticleTags(article)
  };
}

async function resolveArticleFilePath(config, articleId) {
  return `${config.articleDirectory}/${articleId}.json`;
}

async function createDraftArticleInternal(articleInput) {
  try {
    const config = requireConfig();
    const draft = buildDraftArticlePayload(articleInput);
    const filename = toArticleFilename(config, draft);

    const commitHeadline = `Create article draft ${draft.id}`;

    const commitOnce = async () => {
      const expectedHead = await getBranchHeadOid(config);
      if (!expectedHead)
        throw new Error('Unable to resolve branch head for draft creation.');

      return commitFilesSingleApiCall(
        config,
        [{ path: filename, content: JSON.stringify(draft, null, 2) }],
        commitHeadline,
        expectedHead
      );
    };

    try {
      await commitOnce();
    } catch (error) {
      const message = getErrorMessage(error);
      if (!isHeadConflictMessage(message))
        throw error;

      await commitOnce();
    }

    return { created: true, article: draft, filename };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Error creating article draft on GitHub:', message);
    return { created: false, article: null, filename: null, error: message };
  }
}

async function setArticleForumPostUrlInternal(articleId, forumPostUrl) {
  try {
    const config = requireConfig();
    const normalizedId = String(articleId || '').trim();
    const normalizedForumPostUrl = normalizeHttpUrl(forumPostUrl);

    if (!normalizedId)
      return { updated: false, article: null, error: 'Missing article id.' };

    if (!normalizedForumPostUrl)
      return { updated: false, article: null, error: 'Missing or invalid forum post url.' };

    let finalArticle = null;

    const commitHeadline = `Set forum post url for article ${normalizedId}`;

    const runUpdate = async () => {
      const articlePath = await resolveArticleFilePath(config, normalizedId);

      const currentArticleFile = await getRepoFile(config, articlePath);
      if (!currentArticleFile.exists)
        throw new Error(`Draft article ${normalizedId} was not found.`);

      const currentArticle = parseArticle(currentArticleFile.content);
      if (!currentArticle)
        throw new Error(`Draft article ${normalizedId} is invalid JSON.`);

      const updatedArticle = {
        ...currentArticle,
        id: normalizedId,
        forum_post_url: normalizedForumPostUrl
      };

      const additions = [
        { path: articlePath, content: JSON.stringify(updatedArticle, null, 2) }
      ];

      const indexFile = await getRepoFile(config, config.indexPath);
      const index = parseIndex(indexFile.content);

      if (!index.articles || typeof index.articles !== 'object' || Array.isArray(index.articles))
        index.articles = {};

      if (index.articles[normalizedId]) {
        index.articles[normalizedId] = toIndexEntry(updatedArticle, articlePath);
        index.updated_at = new Date().toISOString();
        additions.push({ path: config.indexPath, content: JSON.stringify(index, null, 2) });
      }

      const expectedHead = await getBranchHeadOid(config);
      if (!expectedHead)
        throw new Error('Unable to resolve branch head for forum url update.');

      await commitFilesSingleApiCall(
        config,
        { additions },
        commitHeadline,
        expectedHead
      );

      finalArticle = updatedArticle;
    };

    try {
      await runUpdate();
    } catch (error) {
      const message = getErrorMessage(error);
      if (!isHeadConflictMessage(message))
        throw error;

      await runUpdate();
    }

    return { updated: true, article: finalArticle, error: null };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Error saving article forum post url on GitHub:', message);
    return { updated: false, article: null, error: message };
  }
}
async function publishArticleByIdInternal(articleId, options = {}) {
  try {
    const config = requireConfig();
    const normalizedId = String(articleId || '').trim();

    if (!normalizedId)
      return { published: false, alreadyPublished: false, article: null, error: 'Missing article id.' };

    let finalArticle = null;
    let finalAlreadyPublished = false;

    const commitHeadline = `Publish article ${normalizedId}`;

    const runPublish = async () => {
      const articlePath = await resolveArticleFilePath(config, normalizedId);

      const currentArticleFile = await getRepoFile(config, articlePath);
      if (!currentArticleFile.exists)
        throw new Error(`Draft article ${normalizedId} was not found.`);

      const currentArticle = parseArticle(currentArticleFile.content);
      if (!currentArticle)
        throw new Error(`Draft article ${normalizedId} is invalid JSON.`);

      const updatedArticle = {
        ...currentArticle,
        id: normalizedId,
        published: true,
        article_time: currentArticle.article_time || new Date().toISOString()
      };
      updatedArticle.forum_post_url = normalizeHttpUrl(options?.forum_post_url) || normalizeHttpUrl(currentArticle?.forum_post_url);
      const updatedLines = extractContentLines(updatedArticle.content);
      updatedArticle.line1 = updatedLines.line1;
      updatedArticle.line2 = updatedLines.line2;
      updatedArticle.tags = normalizeArticleTags(updatedArticle);

      const indexFile = await getRepoFile(config, config.indexPath);
      const index = parseIndex(indexFile.content);

      if (!index.articles || typeof index.articles !== 'object' || Array.isArray(index.articles))
        index.articles = {};

      const alreadyPublished = Boolean(index.articles[normalizedId]) || Boolean(currentArticle.published);
      index.articles[normalizedId] = toIndexEntry(updatedArticle, articlePath);
      index.updated_at = new Date().toISOString();

      finalArticle = updatedArticle;
      finalAlreadyPublished = alreadyPublished;

      const expectedHead = await getBranchHeadOid(config);
      if (!expectedHead)
        throw new Error('Unable to resolve branch head for publish.');

      return commitFilesSingleApiCall(
        config,
        {
          additions: [
            { path: articlePath, content: JSON.stringify(updatedArticle, null, 2) },
            { path: config.indexPath, content: JSON.stringify(index, null, 2) }
          ]
        },
        commitHeadline,
        expectedHead
      );
    };

    try {
      await runPublish();
    } catch (error) {
      const message = getErrorMessage(error);
      if (!isHeadConflictMessage(message))
        throw error;

      await runPublish();
    }

    return { published: true, alreadyPublished: finalAlreadyPublished, article: finalArticle, error: null };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Error publishing article to GitHub:', message);
    return { published: false, alreadyPublished: false, article: null, error: message };
  }
}

async function deleteArticleByIdInternal(articleId) {
  try {
    const config = requireConfig();
    const normalizedId = String(articleId || '').trim();

    if (!normalizedId) {
      return {
        deleted: false,
        articleId: null,
        notFound: false,
        error: 'Missing article id.'
      };
    }

    let deletedFile = false;
    let removedFromIndex = false;

    const commitHeadline = `Delete article ${normalizedId}`;

    const buildDeletePayload = async () => {
      const indexFile = await getRepoFile(config, config.indexPath);
      const index = parseIndex(indexFile.content);
      const filename = await resolveArticleFilePath(config, normalizedId);

      const articleFile = await getRepoFile(config, filename);
      const fileExists = Boolean(articleFile?.exists);
      const hadIndexEntry = Boolean(index.articles?.[normalizedId]);

      if (!fileExists && !hadIndexEntry)
        return { notFound: true, additions: [], deletions: [] };

      if (hadIndexEntry)
        delete index.articles[normalizedId];

      if (indexFile.exists || hadIndexEntry)
        index.updated_at = new Date().toISOString();

      const additions = [];
      if (indexFile.exists || hadIndexEntry) {
        additions.push({
          path: config.indexPath,
          content: JSON.stringify(index, null, 2)
        });
      }

      const deletions = [];
      if (fileExists && filename)
        deletions.push({ path: filename });

      deletedFile = fileExists;
      removedFromIndex = hadIndexEntry;

      return {
        notFound: false,
        additions,
        deletions
      };
    };

    const commitDelete = async () => {
      const payload = await buildDeletePayload();
      if (payload.notFound)
        return { notFound: true };

      const expectedHead = await getBranchHeadOid(config);
      if (!expectedHead)
        throw new Error('Unable to resolve branch head for delete.');

      await commitFilesSingleApiCall(
        config,
        { additions: payload.additions, deletions: payload.deletions },
        commitHeadline,
        expectedHead
      );

      return { notFound: false };
    };

    let deleteResult;
    try {
      deleteResult = await commitDelete();
    } catch (error) {
      const message = getErrorMessage(error);
      if (!isHeadConflictMessage(message))
        throw error;

      deleteResult = await commitDelete();
    }

    if (deleteResult?.notFound) {
      return {
        deleted: false,
        articleId: normalizedId,
        notFound: true,
        error: null
      };
    }

    return {
      deleted: true,
      articleId: normalizedId,
      deletedFile,
      removedFromIndex,
      error: null
    };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Error deleting article from GitHub:', message);

    return {
      deleted: false,
      articleId: String(articleId || '').trim() || null,
      notFound: false,
      error: message
    };
  }
}

async function loadIndex(config, ref = null) {
  const indexFile = await getRepoFile(config, config.indexPath, ref);
  const index = parseIndex(indexFile.content);

  return {
    index,
    sha: indexFile.sha
  };
}

async function getArticleById(articleId) {
  const config = requireConfig();
  const normalizedId = String(articleId || '').trim();
  if (!normalizedId)
    return null;
  const filename = await resolveArticleFilePath(config, normalizedId);

  const file = await getRepoFile(config, filename);
  if (!file.exists || !file.content)
    return null;

  return parseArticle(file.content);
}

async function getLatestArticles(limit = 10) {
  const config = requireConfig();
  const { index } = await loadIndex(config);

  const entries = Object.entries(index.articles)
    .map(([id, data]) => ({
      id,
      filename: data.filename,
      timestamp: data.timestamp
    }))
    .filter(entry => entry.filename && entry.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);

  const articles = [];

  for (const entry of entries) {
    const file = await getRepoFile(config, entry.filename);
    if (!file.exists || !file.content)
      continue;

    const parsed = parseArticle(file.content);
    if (parsed?.published === true)
      articles.push(parsed);
  }

  return articles;
}

function createDraftArticle(articleInput) {
  return enqueueArticleWrite(() => createDraftArticleInternal(articleInput));
}

function publishArticleById(articleId, options = {}) {
  return enqueueArticleWrite(() => publishArticleByIdInternal(articleId, options));
}

function setArticleForumPostUrl(articleId, forumPostUrl) {
  return enqueueArticleWrite(() => setArticleForumPostUrlInternal(articleId, forumPostUrl));
}

function deleteArticleById(articleId) {
  return enqueueArticleWrite(() => deleteArticleByIdInternal(articleId));
}

module.exports = {
  createDraftArticle,
  publishArticleById,
  setArticleForumPostUrl,
  deleteArticleById,
  getArticleById,
  getLatestArticles
};




