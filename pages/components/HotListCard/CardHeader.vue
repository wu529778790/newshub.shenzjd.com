<template>
  <header class="relative p-4 md:p-6 pb-3 md:pb-4 border-b border-base-300/30">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3 flex-1 min-w-0">
        <div
          v-if="source.icon"
          class="w-8 h-8 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0"
          v-html="source.icon"></div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-2">
            <h3 class="font-semibold text-base text-base-content truncate">
              {{ source.name }}
            </h3>
            <!-- 置顶标识 -->
            <svg
              v-if="isPinned"
              class="w-4 h-4 text-primary flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.856 1.233.856a1 1 0 01-.894 1.79l-1.599-.8L11 6.323V7.5a1 1 0 01-2 0V6.323L6.046 4.741 4.447 5.541a1 1 0 01-.894-1.79l1.233-.856-1.233-.856a1 1 0 01.894-1.79l1.599.8L9 3.323V2.5a1 1 0 011-1z" />
            </svg>
          </div>
          <div class="flex items-center space-x-2 mt-1">
            <div
              class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs text-base-content/60">实时更新</span>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-1 flex-shrink-0">
        <!-- 置顶按钮 -->
        <button
          class="btn btn-ghost btn-sm btn-circle hover:bg-warning/10"
          @click="$emit('togglePin', source.id)"
          :title="isPinned ? `取消置顶 ${source.name}` : `置顶 ${source.name}`">
          <svg
            v-if="!isPinned"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <svg
            v-else
            class="w-4 h-4 text-warning"
            fill="currentColor"
            viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>

        <!-- 刷新按钮 -->
        <button
          class="btn btn-ghost btn-sm btn-circle hover:bg-primary/10"
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
      </div>
    </div>

    <!-- 加载进度条 -->
    <div v-if="loading" class="mt-3 md:mt-4">
      <div class="w-full bg-base-300/30 rounded-full h-1 overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"
          style="width: 60%"></div>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  source: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['refresh', 'togglePin']);
</script>
