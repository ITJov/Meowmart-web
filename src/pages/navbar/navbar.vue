<template>
  <VAppBar
    color="surface"
    elevation="3"
  >
    <VAppBarNavIcon
      class="d-md-none"
      @click="$emit('toggle-sidebar')"
    />

    <VSpacer />

    <div
      style="width: 250px;"
      class="me-4"
    >
      <VSelect
        v-model="selectedBranch"
        :items="allBranches"
        item-title="name"
        item-value="id"
        label="Lokasi Cabang"
        variant="solo-filled"
        density="compact"
        flat
        hide-details
        return-object
        :disabled="isCashier"
      />
    </div>

    <VBtn
      icon
      class="me-2"
    >
      <VIcon icon="mdi-theme-light-dark" />
    </VBtn>

    <VBtn
      icon
      class="me-2"
    >
      <VBadge
        dot
        color="error"
      >
        <VIcon icon="mdi-bell-outline" />
      </VBadge>
    </VBtn>

    <VMenu
      offset-y
      location="bottom end"
      transition="scale-transition"
    >
      <template #activator="{ props }">
        <VBtn
          v-bind="props"
          class="me-2"
          icon
        >
          <VAvatar
            color="warning"
            size="36"
          >
            <span class="text-h6">{{ userInitials }}</span>
          </VAvatar>
        </VBtn>
      </template>

      <VList>
        <VListItem
          :title="userName"
          :subtitle="userRole"
          class="mb-2"
        >
          <template #prepend>
            <VAvatar
              color="warning"
              class="me-3"
            >
              <span class="text-h6">{{ userInitials }}</span>
            </VAvatar>
          </template>
        </VListItem>

        <VDivider />

        <VListItem
          link
          title="Profile"
          prepend-icon="mdi-account-outline"
          @click="goToProfile" 
        />
        <VListItem
          link
          title="Logout"
          prepend-icon="mdi-logout"
          @click="handleLogout"
        />
      </VList>
    </VMenu>
  </VAppBar>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../../plugins/axios'

const router = useRouter()
const emit = defineEmits(['toggle-sidebar'])

const userDataString = localStorage.getItem('userData')
const userData = userDataString ? JSON.parse(userDataString) : {}
const userName = ref(userData.name || 'User')
const userRole = ref(userData.role_name || 'Role') // Mengambil role_name dari backend

const userInitials = computed(() => {
  const nameParts = userName.value.split(' ')
  if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
  return nameParts[0] ? nameParts[0].substring(0, 2).toUpperCase() : 'U'
})

// === COMPUTED PROPERTY BARU ===
const isCashier = computed(() => userRole.value.toLowerCase() === 'kasir');
// =============================

interface Branch {
  id: number;
  name: string;
}

const allBranches = ref<Branch[]>([])
const selectedBranch = ref<Branch | null>(null)
const isInitialLoad = ref(true)

const fetchBranches = async () => {
  try {
    const { data } = await axios.get('/api/branches')
    if (data && data.data) {
      const branchData = Array.isArray(data.data) ? data.data : data.data.data
      if (Array.isArray(branchData)) {
        allBranches.value = branchData
      }
    }
  } catch (error) {
    console.error('Gagal mengambil daftar cabang:', error)
  }
}

onMounted(async () => {
  await fetchBranches()

  const activeBranchString = localStorage.getItem('activeBranch')
  if (activeBranchString) {
    selectedBranch.value = JSON.parse(activeBranchString)
  } else if (allBranches.value.length > 0) {
    selectedBranch.value = allBranches.value[0]
  }

  setTimeout(() => { isInitialLoad.value = false }, 500)
})

watch(selectedBranch, (newActiveBranch) => {
  // Hanya proses jika bukan load awal DAN jika user bukan kasir
  if (isInitialLoad.value || !newActiveBranch || isCashier.value) return

  if (newActiveBranch) {
    localStorage.setItem('activeBranch', JSON.stringify(newActiveBranch))

    // Trigger event agar komponen lain me-refresh data
    window.dispatchEvent(new CustomEvent('branch-changed'));
  }
})

const goToProfile = () => {
    router.push({ name: 'profileView' });
}


const handleLogout = async () => {
  try {
    await axios.post('/api/logout')
  } catch (error) {
    console.error('Logout di backend gagal, tetap lanjutkan:', error)
  } finally {
    localStorage.removeItem('userData')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('activeBranch')
    router.push({ name: 'Login' })
  }
}
</script>