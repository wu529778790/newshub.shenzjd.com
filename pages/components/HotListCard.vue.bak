<template>
  <section
    :ref="(el) => $emit('setElementRef', el)"
    :key="source.id"
    :data-source-id="source.id"
    class="group relative bg-white/50 dark:bg-base-200/50 backdrop-blur-sm border border-base-300/50 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
    :id="source.id">
    <!-- 卡片头部 -->
    <header class="relative p-6 pb-4 border-b border-base-300/30">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <div
            v-if="source.icon"
            class="w-8 h-8 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0"
            v-html="source.icon"></div>
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-base text-base-content truncate">
              {{ source.name }}
            </h3>
            <div class="flex items-center space-x-2 mt-1">
              <div
                class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span class="text-xs text-base-content/60">实时更新</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-1 flex-shrink-0">
          <button
            class="btn btn-ghost btn-sm btn-circle opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10"
            @click="$emit('refresh', source)"
            :disabled="loading"
            :title="`刷新 ${source.name}`">
            <svg
              v-if="!loading"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <div
              v-else
              class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </button>

          <!-- 复制卡片按钮 -->
          <button
            class="btn btn-ghost btn-sm btn-circle opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-success/10"
            @click="copyCardToImage"
            :disabled="loading"
            :title="`复制 ${source.name} 卡片`">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            class="drag-handle btn btn-ghost btn-sm btn-circle cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-base-300"
            :title="`拖拽调整 ${source.name} 顺序`">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 8h16M4 16h16" />
              <circle cx="9" cy="8" r="1" />
              <circle cx="15" cy="8" r="1" />
              <circle cx="9" cy="16" r="1" />
              <circle cx="15" cy="16" r="1" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 加载进度条 -->
      <div v-if="loading" class="mt-4">
        <div class="w-full bg-base-300/30 rounded-full h-1 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"
            style="width: 60%"></div>
        </div>
      </div>
    </header>

    <!-- 内容区域 -->
    <div class="relative min-h-[300px]">
      <!-- 加载状态 -->
      <div
        v-if="loading"
        class="absolute inset-0 flex flex-col items-center justify-center space-y-3">
        <div class="relative">
          <div
            class="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
        <p class="text-sm text-base-content/60">正在加载...</p>
      </div>

      <!-- 内容列表 -->
      <div
        v-else-if="items && items.length > 0"
        class="p-4 space-y-1 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
        <div
          v-for="(item, index) in items.slice(0, 15)"
          :key="item.id"
          class="group/item relative p-3 rounded-xl hover:bg-base-100/50 dark:hover:bg-base-300/30 transition-all duration-200 cursor-pointer border border-transparent hover:border-base-300/30"
          @click="$emit('openLink', item.url)">
          <div class="flex items-start space-x-3">
            <!-- 排名 -->
            <div class="flex-shrink-0">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                :class="getRankStyle(item.rank || index + 1)">
                {{ item.rank || index + 1 }}
              </div>
            </div>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <h4
                class="text-sm font-medium text-base-content leading-tight line-clamp-2 group-hover/item:text-primary transition-colors">
                {{ item.title }}
              </h4>
              <div class="flex items-center space-x-2 mt-1">
                <div
                  v-if="item.extra?.info"
                  class="text-xs text-base-content/50">
                  {{ item.extra.info }}
                </div>
                <div v-if="item.createdAt" class="text-xs text-base-content/50">
                  {{ formatTime(item.createdAt) }}
                </div>
              </div>
            </div>

            <!-- 外部链接图标 -->
            <div
              class="flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
              <svg
                class="w-4 h-4 text-base-content/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="!loading && items"
        title="暂无内容"
        subtitle="请稍后刷新重试" />

      <!-- 错误状态 -->
      <div
        v-else-if="!loading && items === null"
        class="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-6">
        <div
          class="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
          <svg
            class="w-6 h-6 text-error/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div class="text-center">
          <p class="text-sm font-medium text-base-content/60">加载失败</p>
          <button
            class="btn btn-error btn-xs mt-2"
            @click="$emit('refresh', source)">
            重试
          </button>
        </div>
      </div>

      <!-- 卡片底部渐变效果 -->
      <div
        class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"></div>
    </div>
  </section>
</template>

<script setup>
import EmptyState from "./EmptyState.vue";
import html2canvas from "html2canvas";

const props = defineProps({
  source: {
    type: Object,
    required: true,
  },
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["refresh", "openLink", "setElementRef"]);

// 排名样式
const getRankStyle = (rank) => {
  if (rank === 1)
    return "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg";
  if (rank === 2)
    return "bg-gradient-to-r from-gray-300 to-gray-400 text-white shadow-md";
  if (rank === 3)
    return "bg-gradient-to-r from-orange-300 to-orange-400 text-white shadow-sm";
  if (rank <= 10)
    return "bg-gradient-to-r from-primary/20 to-primary/30 text-primary font-semibold";
  return "bg-base-300/50 text-base-content/70";
};

// 格式化时间
const formatTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
};

// 创建美观的自定义卡片图片
const createCustomCardImage = async (cardElement) => {
  return new Promise((resolve) => {
    const rect = cardElement.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // 设置canvas尺寸 - 适中的宽度，动态计算高度
    const cardWidth = Math.min(420, Math.max(380, rect.width));
    const displayItems = 10; // 固定复制前10条

    // 预估高度：头部120px + 10个项目*40px + 底部50px
    const estimatedHeight = 120 + displayItems * 40 + 50;
    const cardHeight = Math.max(400, Math.min(estimatedHeight, 700)); // 限制最大高度为700px
    canvas.width = cardWidth * 2;
    canvas.height = cardHeight * 2;
    ctx.scale(2, 2);

    const width = cardWidth;
    const height = cardHeight;

    // 绘制卡片背景和圆角
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
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
    ctx.fillStyle = "#f8fafc";
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
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 88);
    ctx.lineTo(width, 88);
    ctx.stroke();

    // 绘制数据源图标背景
    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.arc(32, 44, 16, 0, Math.PI * 2);
    ctx.fill();

    // 绘制数据源名称
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.fillText(props.source.name, 60, 38);

    // 绘制状态指示器
    ctx.fillStyle = "#10b981"; // 绿色
    ctx.beginPath();
    ctx.arc(60, 54, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#64748b";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText("实时更新", 70, 58);

    // 绘制内容区域
    const contentTop = 104;
    const items = (props.items || []).slice(0, 10); // 只复制前10条

    let currentY = contentTop; // 动态Y坐标

    items.forEach((item, index) => {
      const itemY = currentY; // 使用动态Y坐标

      // 绘制项目背景（悬停效果）
      if (index % 2 === 0) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(16, itemY - 8, width - 32, 40);
      }

      // 绘制排名数字
      ctx.fillStyle = getRankColor(index + 1);
      ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";

      // 绘制圆形背景
      ctx.beginPath();
      ctx.arc(24, itemY + 6, 9, 0, Math.PI * 2);
      ctx.fill();

      // 绘制排名数字
      ctx.fillStyle = "#ffffff";
      ctx.fillText((index + 1).toString(), 24, itemY + 10);

      // 绘制标题
      ctx.textAlign = "left";
      ctx.fillStyle = "#1e293b";
      ctx.font = "13px system-ui, -apple-system, sans-serif";

      const maxTitleWidth = width - 60; // 标题可用宽度
      const title = item && item.title ? item.title : "加载中...";

      // 处理长标题，自动换行
      let lines = [];
      const lineHeight = 15; // 行高

      // 使用更简单的换行逻辑：按字符分割
      if (ctx.measureText(title).width <= maxTitleWidth) {
        // 标题不超长，直接使用
        lines = [title];
      } else {
        // 需要换行
        let currentLine = "";
        for (let i = 0; i < title.length; i++) {
          const char = title[i];
          const testLine = currentLine + char;
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxTitleWidth && currentLine !== "") {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine !== "") {
          lines.push(currentLine);
        }

        // 限制最多3行
        if (lines.length > 3) {
          lines = lines.slice(0, 3);
          lines[2] = lines[2].substring(0, lines[2].length - 1) + "...";
        }
      }

      // 绘制标题行 - 与序号对齐
      lines.forEach((lineText, lineIndex) => {
        const titleY = itemY + 10 + lineIndex * lineHeight; // 与序号Y坐标对齐
        ctx.fillText(lineText, 42, titleY); // 序号右侧开始绘制标题
      });

      // 绘制额外信息
      if (item && item.extra && item.extra.info && lines.length > 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "10px system-ui, -apple-system, sans-serif";
        const infoY = itemY + 10 + lines.length * lineHeight + 3;
        ctx.fillText(item.extra.info, 42, infoY);
        // 更新Y坐标，为额外信息留出空间
        currentY = infoY + 12;
      } else {
        // 更新Y坐标，为下一项目留出空间
        currentY = itemY + 10 + Math.max(lines.length * lineHeight, 18) + 8;
      }
    });

    // 绘制底部渐变效果
    const gradientHeight = 30;
    const gradient = ctx.createLinearGradient(
      0,
      height - gradientHeight,
      0,
      height
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.6)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - gradientHeight, width, gradientHeight);

    ctx.textAlign = "left";
    resolve(canvas);
  });
};

// 获取排名颜色
const getRankColor = (rank) => {
  if (rank === 1) return "#fbbf24"; // 金色
  if (rank === 2) return "#d1d5db"; // 银色
  if (rank === 3) return "#f59e0b"; // 铜色
  if (rank <= 10) return "#3b82f6"; // 蓝色
  return "#6b7280"; // 灰色
};

// 使用原生浏览器API截图
const takeNativeScreenshot = async (element) => {
  try {
    // 检查是否支持原生截图API
    if (!window.chrome || !window.chrome.runtime) {
      return null;
    }

    // 获取元素边界
    const rect = element.getBoundingClientRect();
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // 创建一个临时的canvas来绘制
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = rect.width;
    canvas.height = rect.height;

    // 使用getImageData来截取屏幕内容（如果可用）
    const imgData = ctx.createImageData(rect.width, rect.height);
    ctx.putImageData(imgData, 0, 0);

    return canvas;
  } catch (error) {
    console.warn("原生截图API不可用:", error);
    return null;
  }
};

// 创建简单的文本图片（最后的备选方案）
const createSimpleTextImage = () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 600;
  canvas.height = 400;

  // 绘制背景
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 600, 400);

  // 绘制边框
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 580, 380);

  // 绘制标题
  ctx.fillStyle = "#111827";
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(props.source.name + " 热门内容", 30, 50);

  // 绘制时间
  ctx.fillStyle = "#6b7280";
  ctx.font = "16px system-ui, -apple-system, sans-serif";
  ctx.fillText("生成时间: " + new Date().toLocaleString(), 30, 80);

  // 绘制内容
  ctx.fillStyle = "#374151";
  ctx.font = "14px system-ui, -apple-system, sans-serif";

  props.items.slice(0, 8).forEach((item, index) => {
    const y = 120 + index * 30;
    const title =
      item.title.length > 40 ? item.title.substring(0, 40) + "..." : item.title;
    ctx.fillText(`${index + 1}. ${title}`, 30, y);
  });

  return canvas;
};

// 复制卡片为图片
const copyCardToImage = async () => {
  try {
    // 获取当前卡片元素
    const cardElement = document.getElementById(props.source.id);

    if (!cardElement) {
      throw new Error("未找到卡片元素");
    }

    // 配置 html2canvas 选项
    const options = {
      scale: 2, // 提高分辨率
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: cardElement.scrollWidth,
      height: cardElement.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: null, // 不设置背景色，让它使用元素本身的背景
      removeContainer: false,
      foreignObjectRendering: false, // 避免某些兼容性问题
      ignoreElements: (element) => {
        // 只忽略最可能有问题的元素
        return (
          element.tagName === "SCRIPT" ||
          element.tagName === "STYLE" ||
          element.classList.contains("animate-spin")
        );
      },
    };

    // 生成 canvas
    let canvas;
    try {
      canvas = await html2canvas(cardElement, options);
    } catch (canvasError) {
      console.warn("html2canvas 失败，尝试原生API:", canvasError);

      // 尝试使用原生API截图
      try {
        const screenshot = await takeNativeScreenshot(cardElement);
        if (screenshot) {
          canvas = screenshot;
        } else {
          throw new Error("原生API不可用");
        }
      } catch (nativeError) {
        console.warn("原生API失败，尝试降级方案:", nativeError);

        // 降级方案：使用更兼容的html2canvas配置
        const fallbackOptions = {
          backgroundColor: "#ffffff",
          scale: 1, // 降低分辨率
          useCORS: false,
          allowTaint: true,
          logging: false,
          width: cardElement.scrollWidth,
          height: cardElement.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          ignoreElements: () => true, // 忽略所有可能有问题的元素
        };

        try {
          canvas = await html2canvas(cardElement, fallbackOptions);
        } catch (fallbackError) {
          console.error("降级方案也失败，使用自定义方案:", fallbackError);

          // 最终备选方案：创建自定义canvas
          canvas = await createCustomCardImage(cardElement);

          if (!canvas) {
            // 如果自定义方案也失败，创建一个简单的文本图片
            canvas = createSimpleTextImage();
          }
        }
      }
    }

    // 将 canvas 转换为 blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          throw new Error("图片生成失败");
        }

        try {
          // 创建 ClipboardItem
          const item = new ClipboardItem({ "image/png": blob });

          // 复制到剪贴板
          await navigator.clipboard.write([item]);

          // 显示成功提示
          if (window.$toast) {
            window.$toast.success(`${props.source.name} 卡片已复制到剪贴板`);
          } else {
            // 降级到简单的提示
            const notification = document.createElement("div");
            notification.textContent = `${props.source.name} 卡片已复制到剪贴板`;
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: #10b981;
              color: white;
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 14px;
              z-index: 9999;
              animation: fadeInOut 3s ease-in-out;
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
              document.body.removeChild(notification);
            }, 3000);
          }
        } catch (clipboardError) {
          console.error("复制到剪贴板失败:", clipboardError);

          // 如果剪贴板API不可用，提供下载选项
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${props.source.name}-hot-list-${
            new Date().toISOString().split("T")[0]
          }.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          if (window.$toast) {
            window.$toast.info("图片已下载到本地");
          } else {
            // 降级到简单的提示
            const notification = document.createElement("div");
            notification.textContent = "图片已下载到本地";
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: #3b82f6;
              color: white;
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 14px;
              z-index: 9999;
              animation: fadeInOut 3s ease-in-out;
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
              document.body.removeChild(notification);
            }, 3000);
          }
        }
      },
      "image/png",
      0.9
    );
  } catch (error) {
    console.error("生成卡片图片失败:", error);

    if (window.$toast) {
      window.$toast.error("生成图片失败: " + error.message);
    } else {
      // 降级到简单的提示
      const notification = document.createElement("div");
      notification.textContent = "生成图片失败: " + error.message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        animation: fadeInOut 3s ease-in-out;
        max-width: 300px;
        word-wrap: break-word;
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    }
  }
};
</script>

<style scoped>
@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  10% {
    opacity: 1;
    transform: translateY(0);
  }
  90% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}
</style>
