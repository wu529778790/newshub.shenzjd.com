import { initializeLegacyMigration } from '~/server/services/hot-list.service';
import { sourceRegistry } from '~/server/utils/source-registry';
import { logger } from '~/server/utils/logger';

/**
 * 服务器插件：初始化数据源注册表
 * 在 Nitro 服务器启动时执行
 */
export default defineNitroPlugin(async () => {
  // 在服务器启动时初始化
  logger.info('🚀 初始化数据源注册表...');

  // 执行旧服务迁移（异步）
  await initializeLegacyMigration();

  // 输出注册状态
  const stats = sourceRegistry.list();
  logger.info(`✓ 数据源注册完成，共 ${stats.length} 个数据源`);

  // 输出启用的数据源列表
  const enabled = sourceRegistry.listEnabled();
  logger.info(`✓ 启用的数据源: ${enabled.map(s => s.name).join(', ')}`);
});
