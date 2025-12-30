<template>
  <header
    class="sticky top-0 z-50 bg-base-100/80 backdrop-blur-md border-b border-base-300/50">
    <div class="container mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div
            class="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
            <svg
              class="w-5 h-5 text-primary-content"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path
                d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
          </div>
          <div>
            <h1
              class="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {{ props.title || "热榜聚合" }}
            </h1>
            <p class="text-xs text-base-content/60">
              {{ props.subtitle || "实时聚合各大平台热门内容" }}
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <div v-if="props.showStats" class="text-xs text-base-content/50">
            共 {{ props.sourceCount || 0 }} 个数据源
          </div>

          <!-- 刷新按钮 -->
          <button
            class="btn btn-ghost btn-sm btn-circle"
            @click="$emit('refresh')"
            :title="props.refreshTitle || '刷新全部'">
            <svg
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
          </button>

          <!-- API 文档按钮 -->
          <NuxtLink
            to="/api"
            class="btn btn-ghost btn-sm btn-circle"
            title="API 文档">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </NuxtLink>

          <!-- 主题切换按钮 -->
          <button
            class="btn btn-ghost btn-sm btn-circle"
            @click="toggleTheme"
            :title="
              currentTheme === 'light' ? '切换到深色模式' : '切换到浅色模式'
            ">
            <svg
              v-if="currentTheme === 'light'"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <svg
              v-else
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
// Props
const props = defineProps({
  title: {
    type: String,
    default: "热榜聚合",
  },
  subtitle: {
    type: String,
    default: "实时聚合各大平台热门内容",
  },
  sourceCount: {
    type: Number,
    default: 0,
  },
  showStats: {
    type: Boolean,
    default: true,
  },
  refreshTitle: {
    type: String,
    default: "刷新全部",
  },
});

// 主题管理
const currentTheme = ref("light");

const toggleTheme = () => {
  const newTheme = currentTheme.value === "light" ? "dark" : "light";
  currentTheme.value = newTheme;
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
};

// 初始化主题
onMounted(() => {
  const savedTheme = localStorage.getItem("theme") || "light";
  currentTheme.value = savedTheme;
  document.documentElement.setAttribute("data-theme", savedTheme);
});

defineEmits(["refresh"]);
</script>
