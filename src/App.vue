<template>
  <component :is="layoutComponent">
    <RouterView />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BlankLayout from '@/layout/blankLayout.vue';
import DefaultLayout from '@/layout/defaultLayout.vue';

const route = useRoute();

const layoutComponent = computed(() => {
  if (route.meta.layout === 'blank') {
    return BlankLayout;
  }
  return DefaultLayout;
});
</script>