import { sources } from '~/server/services/sources';
import { genSources } from '~/shared/pre-sources';

export default defineEventHandler(() => {
  // 获取包含完整信息的源数据（包括 column, type, color, icon 等）
  const fullSources = genSources();

  // 转换为前端需要的格式，保留 column 信息
  return sources.map(source => {
    const fullSource = fullSources[source.id];
    return {
      id: source.id,
      name: source.name,
      home: source.home,
      column: fullSource?.column || null,
      type: fullSource?.type || null,
      color: fullSource?.color || null,
      icon: fullSource?.icon || null,
    };
  });
});