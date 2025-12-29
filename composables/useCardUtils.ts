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

export function useImageGenerator() {
  const { getRankColor } = useRankStyle();

  /**
   * 创建自定义卡片图片（推荐方案）
   * 使用 Canvas 手动绘制，避免跨域问题
   */
  const createCustomCardImage = async (
    source: any,
    items: any[],
    cardElement: HTMLElement
  ): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const rect = cardElement.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // 设置canvas尺寸
      const cardWidth = Math.min(420, Math.max(380, rect.width));
      const displayItems = 10;
      const estimatedHeight = 120 + displayItems * 40 + 50;
      const cardHeight = Math.max(400, Math.min(estimatedHeight, 700));

      canvas.width = cardWidth * 2;
      canvas.height = cardHeight * 2;
      ctx.scale(2, 2);

      const width = cardWidth;
      const height = cardHeight;

      // 绘制卡片背景和圆角
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;

      // 创建圆角矩形路径
      const radius = 16;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(width - radius, 0);
      ctx.quadraticCurveTo(width, 0, width, radius);
      ctx.lineTo(width, height - radius);
      ctx.quadraticCurveTo(width, height, width - radius, height);
      ctx.lineTo(radius, height);
      ctx.quadraticCurveTo(0, height, 0, height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 绘制头部区域背景
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(width - radius, 0);
      ctx.quadraticCurveTo(width, 0, width, radius);
      ctx.lineTo(width, 88);
      ctx.lineTo(0, 88);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();

      // 绘制头部底部分割线
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 88);
      ctx.lineTo(width, 88);
      ctx.stroke();

      // 绘制数据源图标背景
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(32, 44, 16, 0, Math.PI * 2);
      ctx.fill();

      // 绘制数据源名称
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText(source.name, 60, 38);

      // 绘制状态指示器
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(60, 54, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('实时更新', 70, 58);

      // 绘制内容区域
      const contentTop = 104;
      const displayItemsList = (items || []).slice(0, 10);

      let currentY = contentTop;

      displayItemsList.forEach((item, index) => {
        const itemY = currentY;

        // 绘制项目背景
        if (index % 2 === 0) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(16, itemY - 8, width - 32, 40);
        }

        // 绘制排名数字
        ctx.fillStyle = getRankColor(index + 1);
        ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';

        // 绘制圆形背景
        ctx.beginPath();
        ctx.arc(24, itemY + 6, 9, 0, Math.PI * 2);
        ctx.fill();

        // 绘制排名数字
        ctx.fillStyle = '#ffffff';
        ctx.fillText((index + 1).toString(), 24, itemY + 10);

        // 绘制标题
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1e293b';
        ctx.font = '13px system-ui, -apple-system, sans-serif';

        const maxTitleWidth = width - 60;
        const title = item?.title || '加载中...';

        // 处理长标题，自动换行
        let lines: string[] = [];
        const lineHeight = 15;

        if (ctx.measureText(title).width <= maxTitleWidth) {
          lines = [title];
        } else {
          let currentLine = '';
          for (let i = 0; i < title.length; i++) {
            const char = title[i];
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxTitleWidth && currentLine !== '') {
              lines.push(currentLine);
              currentLine = char;
            } else {
              currentLine = testLine;
            }
          }

          if (currentLine !== '') {
            lines.push(currentLine);
          }

          if (lines.length > 3) {
            lines = lines.slice(0, 3);
            lines[2] = lines[2].substring(0, lines[2].length - 1) + '...';
          }
        }

        // 绘制标题行
        lines.forEach((lineText, lineIndex) => {
          const titleY = itemY + 10 + lineIndex * lineHeight;
          ctx.fillText(lineText, 42, titleY);
        });

        // 绘制额外信息
        if (item?.extra?.info && lines.length > 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = '10px system-ui, -apple-system, sans-serif';
          const infoY = itemY + 10 + lines.length * lineHeight + 3;
          ctx.fillText(item.extra.info, 42, infoY);
          currentY = infoY + 12;
        } else {
          currentY = itemY + 10 + Math.max(lines.length * lineHeight, 18) + 8;
        }
      });

      // 绘制底部渐变
      const gradientHeight = 30;
      const gradient = ctx.createLinearGradient(
        0,
        height - gradientHeight,
        0,
        height
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, height - gradientHeight, width, gradientHeight);

      ctx.textAlign = 'left';
      resolve(canvas);
    });
  };

  /**
   * 创建简单的文本图片（降级方案）
   */
  const createSimpleTextImage = (
    source: any,
    items: any[]
  ): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    canvas.width = 600;
    canvas.height = 400;

    // 绘制背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 400);

    // 绘制边框
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 580, 380);

    // 绘制标题
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(source.name + ' 热门内容', 30, 50);

    // 绘制时间
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText('生成时间: ' + new Date().toLocaleString(), 30, 80);

    // 绘制内容
    ctx.fillStyle = '#374151';
    ctx.font = '14px system-ui, -apple-system, sans-serif';

    items.slice(0, 8).forEach((item, index) => {
      const y = 120 + index * 30;
      const title =
        item.title.length > 40 ? item.title.substring(0, 40) + '...' : item.title;
      ctx.fillText(`${index + 1}. ${title}`, 30, y);
    });

    return canvas;
  };

  /**
   * 复制图片到剪贴板
   */
  const copyCanvasToClipboard = async (
    canvas: HTMLCanvasElement,
    sourceName: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('图片生成失败'));
          return;
        }

        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve();
        } catch (error) {
          // 如果剪贴板API不可用，提供下载选项
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${sourceName}-hot-list-${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        }
      }, 'image/png');
    });
  };

  return {
    createCustomCardImage,
    createSimpleTextImage,
    copyCanvasToClipboard,
  };
}
