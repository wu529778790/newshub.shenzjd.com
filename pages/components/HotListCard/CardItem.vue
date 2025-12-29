<template>
  <div
    class="group/item relative p-3 rounded-xl hover:bg-base-100/50 dark:hover:bg-base-300/30 transition-all duration-200 cursor-pointer border border-transparent hover:border-base-300/30"
    @click="$emit('openLink', item.url)">
    <div class="flex items-start space-x-3">
      <!-- 排名 -->
      <div class="flex-shrink-0">
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          :class="rankStyle">
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
            {{ formattedTime }}
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
</template>

<script setup>
import { computed } from 'vue';
import { useRankStyle, useTimeFormat } from '~/composables/useCardUtils';

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
});

defineEmits(['openLink']);

// 使用组合式函数
const { getRankStyle } = useRankStyle();
const { formatTime } = useTimeFormat();

const rankStyle = computed(() => {
  return getRankStyle(props.item.rank || props.index + 1);
});

const formattedTime = computed(() => {
  return formatTime(props.item.createdAt);
});
</script>
