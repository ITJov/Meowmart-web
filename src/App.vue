<template>
  <component :is="layoutComponent">
    <RouterView />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BlankLayout from '@/layout/BlankLayout.vue';
import DefaultLayout from '@/layout/DefaultLayout.vue';

const route = useRoute();

const layoutComponent = computed(() => {
  if (route.meta.layout === 'blank') {
    return BlankLayout;
  }
  return DefaultLayout;
});
</script>