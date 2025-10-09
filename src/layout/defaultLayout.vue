<template>
  <VApp>
    <VLayout>
      <Sidebar v-model="isSidebarOpen" />
      
      <Navbar @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

      <VMain>
        <div class="pa-6">
          <RouterView />
        </div>
      </VMain>
    </VLayout>
  </VApp>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from '../pages/sidebar/sidebar.vue'
import Navbar from '../pages/navbar/navbar.vue'

const isSidebarOpen = ref(true)
</script>