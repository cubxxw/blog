const TAGS_API = 'https://api.buttondown.com/v1/tags?page_size=100';

export function resolveButtondownTagIds(tags, requiredNames) {
  if (!Array.isArray(tags)) {
    throw new Error('Buttondown tags response is missing a results array.');
  }

  return Object.fromEntries(requiredNames.map((name) => {
    const matches = tags.filter((tag) => tag?.name === name);
    if (matches.length === 0) {
      throw new Error(`Buttondown tag "${name}" does not exist.`);
    }
    if (matches.length > 1) {
      throw new Error(`Buttondown tag "${name}" is duplicated; expected exactly one match.`);
    }

    const id = matches[0]?.id;
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error(`Buttondown tag "${name}" has no valid identifier.`);
    }

    return [name, id];
  }));
}

export async function fetchButtondownTagIds({ token, requiredNames, fetchImpl = fetch }) {
  const response = await fetchImpl(TAGS_API, {
    headers: { Authorization: `Token ${token}` },
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Buttondown tags lookup failed (${response.status}): ${JSON.stringify(body).slice(0, 300)}`);
  }

  const results = body.results;
  if (Number.isFinite(body.count) && body.count > (results?.length || 0)) {
    throw new Error(`Buttondown returned only ${results?.length || 0} of ${body.count} tags; refusing an incomplete lookup.`);
  }

  return resolveButtondownTagIds(results, requiredNames);
}

export function buildSubscriberTagFilter(tagId) {
  if (typeof tagId !== 'string' || tagId.length === 0) {
    throw new Error('A Buttondown tag identifier is required.');
  }

  return {
    predicate: 'and',
    filters: [
      {
        field: 'subscriber.tags',
        operator: 'contains',
        value: tagId,
      },
    ],
    groups: [],
  };
}
