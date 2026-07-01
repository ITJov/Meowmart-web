<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Kandang</span>
      <VSpacer />
      <VTextField
        v-model="search"
        density="compact"
        label="Pencarian"
        prepend-inner-icon="mdi-magnify"
        variant="solo-filled"
        flat
        hide-details
        single-line
        class="me-4"
        style="max-width: 250px;"
      />
      <VBtn color="primary" @click="openNewItemDialog">
        <VIcon icon="mdi-plus" start />
        Tambah Kandang Baru
      </VBtn>
    </VCardTitle>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="kandangs"
      :items-length="totalKandangs"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchKandangs"
    >
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1">
          <VBtn icon="mdi-pencil" size="small" variant="text" @click="openEditItemDialog(item)" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
        </div>
      </template>
    </VDataTableServer>
  </VCard>

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
                  v-model="editedItem.kode_room"
                  label="Kode Ruang/Kandang"
                  :rules="[v => !!v || 'Kode wajib diisi']"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="editedItem.quota"
                  label="Kuota"
                  type="number"
                  :rules="[v => !!v || 'Kuota wajib diisi']"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="editedItem.status"
                  :items="['Aktif', 'Tidak Aktif', 'Perbaikan']"
                  label="Status"
                  :rules="[v => !!v || 'Status wajib dipilih']"
                />
              </VCol>
            </VRow>
          </VContainer>
        </VForm>
      </VCardText>
      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn color="secondary" @click="closeDialog">Batal</VBtn>
        <VBtn color="primary" @click="save">Simpan</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue' 
import axios from '../../../plugins/axios'
import type { VForm } from 'vuetify/components'

// State untuk Tabel
const kandangs = ref<any[]>([])
const search = ref('')
const loading = ref(true)
const totalKandangs = ref(0)
const options = ref({
  page: 1,
  itemsPerPage: 10,
})

const headers = [
  { title: 'KODE RUANG', key: 'kode_room' },
  { title: 'KUOTA', key: 'quota' },
  { title: 'STATUS', key: 'status' },
  { title: 'AKSI', key: 'actions', sortable: false },
]

// State untuk Dialog
const isDialogVisible = ref(false)
const refVForm = ref<VForm>()
const editedIndex = ref(-1)
const editedItem = ref({
  id: 0,
  kode_room: '',
  quota: 1,
  status: 'Aktif',
  flag_deleted: false // Tambahkan flag_deleted
})
const defaultItem = { ...editedItem.value }
const formTitle = computed(() => (editedIndex.value === -1 ? 'Tambah Kandang Baru' : 'Edit Data Kandang'))

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) {
        return JSON.parse(activeBranchString).id;
    }
    return null;
}

// Logika Fetch Data
const fetchKandangs = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    alert('Cabang aktif tidak ditemukan. Silakan pilih cabang di navbar.');
    kandangs.value = [];
    totalKandangs.value = 0;
    return;
  }

  loading.value = true
  try {
    const { data } = await axios.get('/api/kandangs', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId, 
      },
    })
    kandangs.value = data.data.data; 
    totalKandangs.value = data.data.total; 
  } catch (error) {
    console.error('Gagal mengambil data kandang:', error)
  } finally {
    loading.value = false
  }
}

// DITAMBAHKAN: Listener untuk reaktivitas
onMounted(() => {
    fetchKandangs();
    window.addEventListener('branch-changed', fetchKandangs);
});

// DITAMBAHKAN: Hapus listener untuk best practice
onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchKandangs);
});

watch(search, () => {
  options.value.page = 1
  fetchKandangs()
})

// Logika Dialog & CRUD
const openNewItemDialog = () => {
  editedIndex.value = -1
  editedItem.value = { ...defaultItem }
  isDialogVisible.value = true
}

const openEditItemDialog = (item: any) => {
  editedIndex.value = kandangs.value.indexOf(item)
  editedItem.value = { ...item }
  isDialogVisible.value = true
}

const closeDialog = () => {
  isDialogVisible.value = false
}

const save = async () => {
  const { valid } = await refVForm.value!.validate()
  if (!valid) return

  const branchId = getActiveBranchId();
  if (!branchId) return;

  // Tambahkan branches_id ke payload saat menyimpan
  const payload = {
    ...editedItem.value,
    branches_id: branchId,
  }

  loading.value = true
  try {
    if (editedIndex.value > -1) {
      await axios.put(`/api/kandangs/${editedItem.value.id}`, payload)
    } else {
      await axios.post('/api/kandangs', payload)
    }
    closeDialog()
    fetchKandangs()
  } catch (error) {
    console.error('Gagal menyimpan data:', error)
  } finally {
    loading.value = false
  }
}

const deleteItem = async (item: any) => {
  if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
    loading.value = true
    try {
      // Hanya kirim ID ke backend, logika soft delete ada di controller
      await axios.delete(`/api/kandangs/${item.id}`)
      fetchKandangs()
    } catch (error) {
      console.error('Gagal menghapus data:', error)
    } finally {
      loading.value = false
    }
  }
}
</script>