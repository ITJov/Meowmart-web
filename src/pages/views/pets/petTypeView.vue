<template>
  <div>
    <VCard>
      <VCardTitle class="d-flex align-center pa-4">
        <span class="text-h5">Master Data Tipe Hewan</span>
        <VSpacer />
        <VTextField
          v-model="search"
          density="compact"
          label="Cari Tipe Hewan"
          prepend-inner-icon="mdi-magnify"
          variant="solo-filled"
          flat
          hide-details
          single-line
          class="me-4"
          style="max-width: 250px;"
        />
        <VBtn color="primary" @click="openNewItemDialog()">
          <VIcon icon="mdi-plus" start />
          Tambah Tipe
        </VBtn>
      </VCardTitle>
    </VCard>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="petTypes"
      :items-length="totalItems"
      :loading="loading"
      @update:options="fetchPetTypes"
    >
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1">
          <VBtn icon="mdi-pencil" size="small" variant="text" @click="openEditItemDialog(item)" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
        </div>
      </template>
    </VDataTableServer>

    <VDialog v-model="isDialogVisible" max-width="500px">
      <VCard>
        <VCardTitle class="pa-4">
          <span class="text-h5">{{ formTitle }}</span>
        </VCardTitle>
        <VCardText>
          <VForm ref="refVForm" @submit.prevent="save">
            <VContainer>
              <VRow>
                <VCol cols="12">
                  <VTextField
                    v-model="editedItem.name"
                    label="Nama Tipe Hewan (Contoh: Kucing, Anjing)"
                    :rules="[v => !!v || 'Nama wajib diisi']"
                    variant="outlined"
                    density="compact"
                  />
                </VCol>
              </VRow>
            </VContainer>
          </VForm>
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn color="secondary" variant="text" @click="closeDialog">Batal</VBtn>
          <VBtn color="primary" variant="flat" :loading="loading" @click="save">Simpan</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import axios from '../../../plugins/axios'
import type { VForm } from 'vuetify/components'

// Interface Data
interface PetType {
  id: number | null
  name: string
}

// State
const petTypes = ref<PetType[]>([]) 
const search = ref('')
const loading = ref(false)
const totalItems = ref(0)
const options = ref({ page: 1, itemsPerPage: 10 })

const headers = [
  { title: 'NAMA TIPE', key: 'name' },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' as const },
]

const isDialogVisible = ref(false)
const refVForm = ref<VForm>()
const editedIndex = ref(-1)
const editedItem = ref<PetType>({ id: null, name: '' })
const defaultItem: PetType = { id: null, name: '' }

const formTitle = computed(() => (editedIndex.value === -1 ? 'Tambah Tipe Hewan' : 'Edit Tipe Hewan'))

// Fungsi untuk mendapatkan Branch ID yang aktif (Referensi dari Kode Tabel Hewan Anda)
const getActiveBranchId = () => {
  const activeBranchString = localStorage.getItem('activeBranch')
  if (activeBranchString) {
    return JSON.parse(activeBranchString).id
  }
  return null
}

// Fetch Data
const fetchPetTypes = async () => {
  const branchId = getActiveBranchId()
  if (!branchId) return

  loading.value = true
  try {
    const { data } = await axios.get('/api/petType', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId,
      },
    })
    petTypes.value = data.data.data || data.data
    totalItems.value = data.data.total || petTypes.value.length
  } catch (error) {
    console.error('Gagal memuat data:', error)
  } finally {
    loading.value = false
  }
}

// Watcher untuk pencarian
watch(search, () => {
  options.value.page = 1
  fetchPetTypes()
})

// Logika Dialog
const openNewItemDialog = () => {
  editedIndex.value = -1
  editedItem.value = { ...defaultItem }
  isDialogVisible.value = true
}

const openEditItemDialog = (item: PetType) => {
  editedIndex.value = petTypes.value.indexOf(item)
  editedItem.value = { ...item }
  isDialogVisible.value = true
}

const closeDialog = () => {
  isDialogVisible.value = false
  refVForm.value?.reset()
}

// Simpan Data dengan Payload branches_id (Referensi dari Kode Tabel Hewan Anda)
const save = async () => {
  const { valid } = await refVForm.value!.validate()
  if (!valid) return

  const branchId = getActiveBranchId()
  if (!branchId) return

  const payload = {
    ...editedItem.value,
    branches_id: branchId,
  }

  loading.value = true
  try {
    if (editedIndex.value > -1) {
      await axios.put(`/api/petType/${editedItem.value.id}`, payload)
    } else {
      await axios.post('/api/petType', payload)
    }
    fetchPetTypes()
    closeDialog()
  } catch (err: any) {
    alert(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan')
  } finally {
    loading.value = false
  }
}

const deleteItem = async (item: PetType) => {
  if (confirm(`Hapus tipe "${item.name}"?`)) {
    try {
      await axios.delete(`/api/petType/${item.id}`)
      fetchPetTypes()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus')
    }
  }
}

// Lifecycle Hooks (Sinkronisasi dengan Event Ganti Cabang)
onMounted(() => {
  fetchPetTypes()
  window.addEventListener('branch-changed', fetchPetTypes)
})

onUnmounted(() => {
  window.removeEventListener('branch-changed', fetchPetTypes)
})
</script>