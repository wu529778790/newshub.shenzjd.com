<template>
  <section
    :ref="(el) => $emit('setElementRef', el)"
    :key="source.id"
    :data-source-id="source.id"
    class="group relative bg-white/50 dark:bg-base-200/50 backdrop-blur-sm border rounded-2xl shadow-sm md:hover:shadow-lg transition-all duration-300 md:hover:-translate-y-1 overflow-hidden"
    :class="[
      isPinned
        ? 'border-primary ring-2 ring-primary/20 bg-gradient-to-br from-primary/5 via-white/50 to-white/50 dark:from-primary/10 dark:via-base-200/50 dark:to-base-200/50'
        : 'border-base-300/50'
    ]">
    <!-- 卡片头部 -->
    <CardHeader
      :source="source"
      :loading="loading"
      :is-pinned="isPinned"
      @refresh="$emit('refresh', $event)"
      @togglePin="$emit('togglePin', $event)" />

    <!-- 内容区域 -->
    <CardStates
      :loading="loading"
      :items="items"
      @openLink="$emit('openLink', $event)"
      @refresh="$emit('refresh', source)" />
  </section>
</template>

<script setup>
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
  isPinned: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['refresh', 'openLink', 'setElementRef', 'togglePin']);
</script>
