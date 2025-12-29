import { sourceManager } from '~/server/services/source-manager';
import { Readable } from 'stream';

/**
 * GET /api/v1/stream
 * 流式 API - 逐步返回数据，减少等待时间
 *
 * 查询参数:
 * - sources: 逗号分隔的数据源ID
 * - chunkSize: 每批返回的条目数
 * - delay: 每批之间的延迟（毫秒）
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const sourcesStr = query.sources as string;
  const chunkSize = Number(query.chunkSize) || 5;
  const delay = Number(query.delay) || 500;

  if (!sourcesStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sources parameter is required',
    });
  }

  const sourceIds = sourcesStr.split(',').map(s => s.trim()).filter(Boolean);

  // 设置响应头为流式
  setResponseHeader(event, 'Content-Type', 'application/x-ndjson');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');

  // 创建可读流
  const stream = new Readable({
    read() {},
  });

  // 异步生成数据
  const generateData = async () => {
    for (const id of sourceIds) {
      const config = sourceManager.getSourceInfo(id);

      if (!config) {
        stream.push(
          JSON.stringify({
            type: 'error',
            sourceId: id,
            message: 'Source not found',
          }) + '\n'
        );
        continue;
      }

      // 开始信号
      stream.push(
        JSON.stringify({
          type: 'start',
          sourceId: id,
          name: config.name,
          timestamp: Date.now(),
        }) + '\n'
      );

      try {
        const items = await sourceManager.getHotList(id);

        // 分批发送
        for (let i = 0; i < items.length; i += chunkSize) {
          const chunk = items.slice(i, i + chunkSize);

          stream.push(
            JSON.stringify({
              type: 'data',
              sourceId: id,
              index: i,
              data: chunk,
              count: chunk.length,
            }) + '\n'
          );

          // 等待延迟
          if (delay > 0 && i + chunkSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        // 完成信号
        stream.push(
          JSON.stringify({
            type: 'end',
            sourceId: id,
            total: items.length,
            timestamp: Date.now(),
          }) + '\n'
        );
      } catch (error) {
        stream.push(
          JSON.stringify({
            type: 'error',
            sourceId: id,
            message: error instanceof Error ? error.message : String(error),
          }) + '\n'
        );
      }
    }

    // 结束流
    stream.push(null);
  };

  // 启动生成（不阻塞响应）
  generateData().catch(error => {
    logger.error('Stream generation failed:', error);
    stream.push(null);
  });

  return stream;
});
