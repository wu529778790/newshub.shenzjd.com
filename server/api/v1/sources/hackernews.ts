import { sourceRegistry } from '~/server/utils/source-registry';

export default defineEventHandler(async (event) => {
  const handler = sourceRegistry.get('hackernews')?.handler;

  if (!handler) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Source not found',
    });
  }

  try {
    const data = await handler();
    return {
      apiVersion: '1.0',
      timestamp: Date.now(),
      source: 'hackernews',
      data,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch data',
      data: error,
    });
  }
});
