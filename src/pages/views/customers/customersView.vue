<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Pelanggan</span>
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
        Tambah Pelanggan Baru
      </VBtn>
    </VCardTitle>
    </VCard>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="customers"
      :items-length="totalCustomers"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchCustomers"
    >
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1">
          <VBtn icon="mdi-pencil" size="small" variant="text" @click="openEditItemDialog(item)" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
        </div>
      </template>
    </VDataTableServer>

    <VDialog v-model="isDialogVisible" max-width="600px" persistent>
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
                    label="Nama Pelanggan"
                    :rules="[v => !!v || 'Nama wajib diisi']"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="editedItem.email"
                    label="Email"
                    :rules="[v => !!v || 'Email wajib diisi']"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="editedItem.phone"
                    label="Nomor HP"
                    :rules="[v => !!v || 'Nomor HP wajib diisi']"
                  />
                </VCol>
                <VCol cols="12">
                  <VTextarea v-model="editedItem.address" label="Alamat" />
                </VCol>
                <VCol v-if="editedIndex === -1" cols="12">
                  <VTextField
                    v-model="editedItem.password"
                    label="Password"
                    type="password"
                    :rules="[v => !!v || 'Password wajib diisi saat membuat pelanggan baru']"
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
// DIUBAH: Pastikan onUnmounted di-import
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import axios from '@/plugins/axios'
import type { VForm } from 'vuetify/components'

// --- State untuk Tabel ---
const customers = ref<any[]>([])
const search = ref('')
const loading = ref(true)
const totalCustomers = ref(0)
const options = ref({
  page: 1,
  itemsPerPage: 10,
})

const headers = [
  { title: 'NAMA', key: 'name' },
  { title: 'EMAIL', key: 'email' },
  { title: 'TELEPON', key: 'phone' },
  { title: 'TANGGAL DAFTAR', key: 'created_at' },
  { title: 'AKSI', key: 'actions', sortable: false },
]

// --- State untuk Dialog ---
const isDialogVisible = ref(false)
const refVForm = ref<VForm>()
const editedIndex = ref(-1)
const editedItem = ref({
  id: 0,
  name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
})
const defaultItem = { ...editedItem.value }
const formTitle = computed(() => (editedIndex.value === -1 ? 'Tambah Pelanggan Baru' : 'Edit Data Pelanggan'))

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) {
        return JSON.parse(activeBranchString).id;
    }
    alert('Cabang aktif tidak ditemukan. Silakan pilih cabang di navbar.');
    return null;
}

// --- Logika Fetch Data ---
const fetchCustomers = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;

  loading.value = true
  try {
    const { data } = await axios.get('/api/customers', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId, // Menggunakan 'branches_id' sesuai permintaan
      },
    })
    customers.value = data.data.data
    totalCustomers.value = data.data.total
  }
  catch (error) {
    console.error('Gagal mengambil data pelanggan:', error)
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCustomers();
  window.addEventListener('branch-changed', fetchCustomers);
});

onUnmounted(() => {
  window.removeEventListener('branch-changed', fetchCustomers);
});


watch(search, () => {
  options.value.page = 1
  fetchCustomers()
})

// --- Logika Dialog & CRUD ---
const openNewItemDialog = () => {
  editedIndex.value = -1
  editedItem.value = { ...defaultItem }
  isDialogVisible.value = true
}

const openEditItemDialog = (item: any) => {
  editedIndex.value = customers.value.indexOf(item)
  editedItem.value = { ...item, password: '' }
  isDialogVisible.value = true
}

const closeDialog = () => {
  isDialogVisible.value = false
}

const save = async () => {
  const { valid } = await refVForm.value!.validate()
  if (!valid) return;

  const branchId = getActiveBranchId();
  if (!branchId) return;

  // DIUBAH: Siapkan data untuk dikirim, pastikan nama key konsisten
  const payload = {
      ...editedItem.value,
      branches_id: branchId 
  }

  loading.value = true
  try {
    if (editedIndex.value > -1) {
      await axios.put(`/api/customers/${editedItem.value.id}`, payload)
    }
    else {
      await axios.post('/api/customers', payload)
    }
    closeDialog()
    fetchCustomers()
  }
  catch (error) {
    console.error('Gagal menyimpan data:', error)
  }
  finally {
    loading.value = false
  }
}

const deleteItem = async (item: any) => {
  if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
    loading.value = true
    try {
      await axios.delete(`/api/customers/${item.id}`)
      fetchCustomers()
    }
    catch (error) {
      console.error('Gagal menghapus data:', error)
    }
    finally {
      loading.value = false
    }
  }
}
</script>