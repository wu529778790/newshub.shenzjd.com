<template>
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
      <CardItem
        v-for="(item, index) in items.slice(0, 15)"
        :key="item.id"
        :item="item"
        :index="index"
        @openLink="$emit('openLink', $event)" />
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
          @click="$emit('refresh')">
          重试
        </button>
      </div>
    </div>

    <!-- 卡片底部渐变效果 -->
    <div
      class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"></div>
  </div>
</template>

<script setup>
import EmptyState from '../EmptyState.vue';
import CardItem from './CardItem.vue';

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  items: {
    type: Array,
    default: () => [],
  },
});

defineEmits(['openLink', 'refresh']);
</script>
