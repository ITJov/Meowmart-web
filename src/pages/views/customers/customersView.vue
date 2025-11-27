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
      <!-- --- PERUBAHAN DI SINI: Tambah Tombol Aksi --- -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1">
          <VBtn 
            icon="mdi-plus" 
            size="small" 
            variant="text" 
            color="info" 
            title="Tambah Hewan"
            @click="goToAddPet(item)"
          />
          <VBtn icon="mdi-pencil" size="small" variant="text" title="Edit Pelanggan" @click="openEditItemDialog(item)" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" title="Hapus Pelanggan" @click="deleteItem(item)" />
        </div>
      </template>
      <!-- --- SELESAI PERUBAHAN --- -->

      <!-- Format Tanggal -->
      <template #[`item.created_at`]="{ item }">
        {{ new Date(item.created_at).toLocaleDateString('id-ID') }}
      </template>

    </VDataTableServer>

    <VDialog v-model="isDialogVisible" max-width="600px" persistent>
      <VCard>
        <VCardTitle class="pa-4">
          <span class="text-h5">{{ formTitle }}</span>
        </VCardTitle>
        <VCardText>
          <VForm ref="refVForm" @submit.prevent="save">
            <Container>
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
              </VRow>
            </Container>
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
import { useRouter } from 'vue-router' 
import axios from '@/plugins/axios'
import type { VForm } from 'vuetify/components'

// --- INISIALISASI ROUTER ---
const router = useRouter()

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
  password: '', // Biarkan string kosong
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
        branches_id: branchId,
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
  // Set password menjadi string kosong agar tidak mengirim hash lama
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

  // Siapkan payload
  const payload: any = {
      ...editedItem.value,
      branches_id: branchId 
  }

  // LOGIKA PENTING: Hapus password dari payload jika kosong (untuk mode update/edit)
  // Ini mencegah pengiriman string kosong "" dan menimpa password yang sudah ada.
  if (!payload.password) {
      delete payload.password;
  }
  
  loading.value = true
  try {
    if (editedIndex.value > -1) {
      // Mode Edit: Password dihapus jika tidak diubah
      await axios.put(`/api/customers/${editedItem.value.id}`, payload)
    }
    else {
      // Mode Create: Jika password kosong, backend harus handle (diasumsikan backend bisa handle atau password dikirim sebagai null)
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

// --- FUNGSI BARU UNTUK NAVIGASI ---
const goToAddPet = (customer: any) => {
  // Navigasi ke halaman tambah hewan, membawa ID customer melalui query
  router.push({ 
    name: 'pets-management', 
    query: { new_pet_for_customer: customer.id } 
  });
};
// --- SELESAI ---

</script>