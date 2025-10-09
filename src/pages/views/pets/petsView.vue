<template>
  <!-- DITAMBAHKAN: Satu div sebagai elemen root tunggal -->
  <div>
    <VCard>
      <VCardTitle class="d-flex align-center pa-4">
        <span class="text-h5">Tabel Hewan</span>
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
          Tambah Hewan Baru
        </VBtn>
      </VCardTitle>
    </VCard>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="pets"
      :items-length="totalPets"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchPets"
    >
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1">
          <VBtn icon="mdi-pencil" size="small" variant="text" @click="openEditItemDialog(item)" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
        </div>
      </template>
    </VDataTableServer>

    <VDialog v-model="isDialogVisible" max-width="600px">
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
                    label="Nama Hewan"
                    :rules="[v => !!v || 'Nama wajib diisi']"
                  />
                </VCol>
                <VCol cols="12" md="4">
                    <VTextField v-model="editedItem.breed" label="Ras (Breed)" />
                </VCol>
                <VCol cols="12" md="4">
                    <VTextField v-model="editedItem.color" label="Warna" />
                </VCol>
                <VCol cols="12" md="4">
                    <VTextField v-model="editedItem.age" label="Umur" />
                </VCol>
                <VCol cols="12">
                  <VSelect
                      v-model="editedItem.pet_type_id"
                      :items="petTypes"
                      item-title="name"
                      item-value="id"
                      label="Tipe Hewan"
                      :rules="[v => !!v || 'Tipe Hewan wajib dipilih']"
                  />
                </VCol>
                <VCol cols="12">
                  <VSelect
                      v-model="editedItem.customer_id"
                      :items="customers"
                      item-title="name"
                      item-value="id"
                      label="Pemilik (Customer)"
                      :rules="[v => !!v || 'Pemilik wajib dipilih']"
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
  </div> <!-- AKHIR DARI DIV PEMBUNGKUS -->
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import axios from '@/plugins/axios'
import type { VForm } from 'vuetify/components'

// State untuk Tabel
const pets = ref<any[]>([])
const search = ref('')
const loading = ref(true)
const totalPets = ref(0)
const options = ref({
  page: 1,
  itemsPerPage: 10,
})

const headers = [
  { title: 'NAMA', key: 'name' },
  { title: 'PEMILIK', key: 'customer.name', sortable: false },
  { title: 'TIPE', key: 'pet_type.name', sortable: false },
  { title: 'RAS', key: 'breed' },
  { title: 'WARNA', key: 'color' },
  { title: 'UMUR', key: 'age' },
  { title: 'AKSI', key: 'actions', sortable: false },
] as const;

// State untuk Dialog
const isDialogVisible = ref(false)
const refVForm = ref<VForm>()
const editedIndex = ref(-1)
const editedItem = ref({
  id: 0,
  name: '',
  customer_id: null,
  pet_type_id: null,
  breed: '',
  color: '',
  age: '',
})
const defaultItem = { ...editedItem.value }
const formTitle = computed(() => (editedIndex.value === -1 ? 'Tambah Hewan Baru' : 'Edit Data Hewan'))
const customers = ref([])
const petTypes = ref([])

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) {
        return JSON.parse(activeBranchString).id;
    }
    return null;
}

// Logika Fetch Data
const fetchPets = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;

  loading.value = true
  try {
    const { data } = await axios.get('/api/pets', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId,
      },
    })
    if (data && data.data) {
        pets.value = data.data.data
        totalPets.value = data.data.total
    }
  } catch (error) {
    console.error('Gagal mengambil data hewan:', error)
  } finally {
    loading.value = false
  }
}

const loadInitialData = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    alert('Cabang aktif tidak ditemukan.');
    return;
  }
  
  fetchPets();

  try {
    // Mengambil data customer dan pet type secara paralel untuk efisiensi
    const [customerResponse, petTypeResponse] = await Promise.all([
      axios.get('/api/customers', { params: { all: true, branches_id: branchId } }),
      axios.get('/api/petType') // Endpoint yang sudah benar
    ]);

    // Parsing data customer
    if (customerResponse.data && customerResponse.data.data && customerResponse.data.data.data) {
        customers.value = customerResponse.data.data.data;
    }

    // --- PERBAIKAN UTAMA DI SINI ---
    // Parsing data petType yang lebih aman untuk menangani berbagai format response
    if (petTypeResponse.data && petTypeResponse.data.data) {
        // Cek jika formatnya paginasi: { data: { data: [...] } }
        if (Array.isArray(petTypeResponse.data.data.data)) {
            petTypes.value = petTypeResponse.data.data.data;
        } 
        // Cek jika formatnya array langsung: { data: [...] }
        else if (Array.isArray(petTypeResponse.data.data)) {
            petTypes.value = petTypeResponse.data.data;
        }
    }
    
  } catch (error) {
    console.error('Gagal mengambil data untuk dropdown:', error);
  }
}

onMounted(() => {
  loadInitialData();
  window.addEventListener('branch-changed', loadInitialData);
});

onUnmounted(() => {
  window.removeEventListener('branch-changed', loadInitialData);
});

watch(search, () => {
  options.value.page = 1
  fetchPets()
})

// Logika Dialog & CRUD
const openNewItemDialog = () => {
  editedIndex.value = -1
  editedItem.value = { ...defaultItem }
  isDialogVisible.value = true
}

const openEditItemDialog = (item: any) => {
  editedIndex.value = pets.value.indexOf(item)
  editedItem.value = { ...item,
    customer_id: item.customer?.id || null,
    pet_type_id: item.pet_type?.id || null,
   }
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

  const payload = {
    ...editedItem.value,
    branches_id: branchId,
  }

  loading.value = true
  try {
    if (editedIndex.value > -1) {
      await axios.put(`/api/pets/${editedItem.value.id}`, payload)
    } else {
      await axios.post('/api/pets', payload)
    }
    closeDialog()
    fetchPets()
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
      await axios.delete(`/api/pets/${item.id}`)
      fetchPets()
    } catch (error) {
      console.error('Gagal menghapus data:', error)
    } finally {
      loading.value = false
    }
  }
}
</script>

