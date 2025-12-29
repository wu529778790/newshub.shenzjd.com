/**
 * GET /api/v1/security/ip-whitelist
 * 获取 IP 白名单管理
 */

import { ipWhitelist } from '~/server/utils/security';

export default defineEventHandler(async (event) => {
  // 可选：添加认证检查
  // const config = useRuntimeConfig();
  // const auth = event.node.req.headers.authorization;
  // if (auth !== `Bearer ${config.apiSecret}`) {
  //   throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  // }

  return {
    apiVersion: '1.0',
    timestamp: Date.now(),
    data: {
      whitelist: ipWhitelist.list(),
      count: ipWhitelist.list().length,
    },
  };
});
