<template>
  <section
    :ref="(el) => $emit('setElementRef', el)"
    :key="source.id"
    :data-source-id="source.id"
    class="group relative bg-white/50 dark:bg-base-200/50 backdrop-blur-sm border border-base-300/50 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
    :id="source.id">
    <!-- 卡片头部 -->
    <CardHeader
      :source="source"
      :loading="loading"
      @refresh="$emit('refresh', $event)"
      @copyCard="handleCopyCard" />

    <!-- 内容区域 -->
    <CardStates
      :loading="loading"
      :items="items"
      @openLink="$emit('openLink', $event)"
      @refresh="$emit('refresh', source)" />
  </section>
</template>

<script setup>
import { useImageGenerator } from '~/composables/useCardUtils';
import CardHeader from './CardHeader.vue';
import CardStates from './CardStates.vue';

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

const emit = defineEmits(['refresh', 'openLink', 'setElementRef']);

const { createCustomCardImage, createSimpleTextImage, copyCanvasToClipboard } = useImageGenerator();

/**
 * 显示通知（兼容原生和自定义）
 */
const showNotification = (message, type = 'info') => {
  if (window.$toast) {
    const method = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
    window.$toast[method](message);
    return;
  }

  // 降级方案：创建自定义通知
  const notification = document.createElement('div');
  notification.textContent = message;

  const colors = {
    success: '#10b981',
    info: '#3b82f6',
    error: '#ef4444',
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
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
};

/**
 * 复制卡片为图片（使用三级降级策略）
 */
const handleCopyCard = async () => {
  try {
    const cardElement = document.getElementById(props.source.id);

    if (!cardElement) {
      throw new Error('未找到卡片元素');
    }

    // 尝试创建自定义 Canvas（推荐方案，避免跨域问题）
    try {
      const canvas = await createCustomCardImage(
        props.source,
        props.items,
        cardElement
      );
      await copyCanvasToClipboard(canvas, props.source.name);
      showNotification(`${props.source.name} 卡片已复制到剪贴板`, 'success');
      return;
    } catch (customError) {
      console.warn('自定义Canvas方案失败，尝试降级:', customError);
    }

    // 降级方案：创建简单文本图片
    const canvas = createSimpleTextImage(props.source, props.items);
    await copyCanvasToClipboard(canvas, props.source.name);
    showNotification(`${props.source.name} 卡片已复制到剪贴板`, 'success');
  } catch (error) {
    console.error('生成卡片图片失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    showNotification(`生成图片失败: ${errorMessage}`, 'error');
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
