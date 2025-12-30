/**
 * 卡片工具组合式函数
 * 提供排名样式、时间格式化等通用功能
 */

export function useRankStyle() {
  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#fbbf24'; // 金色
    if (rank === 2) return '#d1d5db'; // 银色
    if (rank === 3) return '#f59e0b'; // 铜色
    if (rank <= 10) return '#3b82f6'; // 蓝色
    return '#6b7280'; // 灰色
  };

  const getRankStyle = (rank: number): string => {
    if (rank === 1)
      return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg';
    if (rank === 2)
      return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white shadow-md';
    if (rank === 3)
      return 'bg-gradient-to-r from-orange-300 to-orange-400 text-white shadow-sm';
    if (rank <= 10)
      return 'bg-gradient-to-r from-primary/20 to-primary/30 text-primary font-semibold';
    return 'bg-base-300/50 text-base-content/70';
  };

  return {
    getRankColor,
    getRankStyle,
  };
}

export function useTimeFormat() {
  const formatTime = (date?: string | Date): string => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  return {
    formatTime,
  };
}

