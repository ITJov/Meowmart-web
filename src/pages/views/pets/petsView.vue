<template>
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
          placeholder="Cari Hewan / No. Telp Pemilik" />
        <VBtn color="primary" @click="openNewItemDialog()">
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
      
      <template #[`item.age_string`]="{ item }">
        {{ item.age_string || 'N/A' }}
      </template>

      <template #[`item.date_of_birth`]="{ item }">
        {{ item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString('id-ID') : '-' }}
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
                    variant="outlined" density="compact"
                  />
                </VCol>
                <VCol cols="12" md="4">
                    <VTextField v-model="editedItem.breed" label="Ras (Breed)" variant="outlined" density="compact" />
                </VCol>
                <VCol cols="12" md="4">
                    <VTextField v-model="editedItem.color" label="Warna" variant="outlined" density="compact" />
                </VCol>
                <VCol cols="12" md="4">
                  <VTextField
                    v-model="editedItem.date_of_birth"
                    label="Tanggal Lahir"
                    type="date"
                    variant="outlined"
                    density="compact"
                  />                
                </VCol>
                
                <VCol cols="12">
                  <VSelect
                      v-model="editedItem.pet_type_id" 
                      :items="petTypes"
                      item-title="name"
                      item-value="id"
                      label="Tipe Hewan"
                      :rules="[v => !!v || 'Tipe Hewan wajib dipilih']"
                      variant="outlined" density="compact"
                      :no-data-text="petTypes.length === 0 ? 'Data Tipe Hewan Kosong' : 'Tidak ditemukan'"
                      :loading="loadingDropdowns"
                  />
                  <div v-if="petTypes.length === 0 && !loadingDropdowns" class="text-caption text-error mt-1">
                    * Data Tipe Hewan kosong. Mohon input Master Data Tipe Hewan terlebih dahulu.
                  </div>
                </VCol>

                <VCol cols="12">
                  <VSelect
                      v-model="editedItem.customer_id"
                      :items="customers"
                      item-title="display_name_phone" 
                      item-value="id"
                      label="Pemilik (Customer)"
                      :rules="[v => !!v || 'Pemilik wajib dipilih']"
                      variant="outlined" 
                      density="compact"
                      :loading="loadingDropdowns"
                      clearable
                      chips prepend-inner-icon="mdi-magnify"
                  />
                </VCol>
              </VRow>
            </VContainer>
          </VForm>
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn color="secondary" variant="text" @click="closeDialog">Batal</VBtn>
          <VBtn color="primary" variant="flat" @click="save">Simpan</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from '../../../plugins/axios'
import type { VForm } from 'vuetify/components'

const router = useRouter()
const route = useRoute()

const pets = ref<any[]>([])
const search = ref('')
const loading = ref(true)
const loadingDropdowns = ref(false)
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
  { title: 'TANGGAL LAHIR', key: 'date_of_birth' },
  { title: 'UMUR', key: 'age_string', sortable: false },
  { title: 'AKSI', key: 'actions', sortable: false },
] as const;

const isDialogVisible = ref(false)
const refVForm = ref<VForm>()
const editedIndex = ref(-1)

const editedItem = ref({
  id: 0,
  name: '',
  customer_id: null as number | null,
  pet_type_id: null as number | null,
  breed: '',
  color: '',
  date_of_birth: null as string | null,
})
const defaultItem = { ...editedItem.value }

const formTitle = computed(() => (editedIndex.value === -1 ? 'Tambah Hewan Baru' : 'Edit Data Hewan'))

const customers = ref<any[]>([])
const petTypes = ref<any[]>([])

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch'); 
    if (activeBranchString) {
        return JSON.parse(activeBranchString).id;
    }
    return null;
}

// FUNGSI INI AKAN MENGIRIM SEARCH KE BACKEND
const fetchPets = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;

  loading.value = true
  try {
    const { data } = await axios.get('/api/pets', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value, // <--- search term dikirim ke backend
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

  loadingDropdowns.value = true;
  try {
    const [customerResponse, petTypeResponse] = await Promise.all([
      axios.get('/api/customers', { params: { all: true, branches_id: branchId } }),
      axios.get('/api/petType', { params: { all: true, branches_id: branchId } }) 
    ]);

    if (customerResponse.data) {
        const rawCustomers = customerResponse.data.data?.data || customerResponse.data.data || [];
        
        customers.value = rawCustomers.map((c: any) => ({
            ...c,
            display_name_phone: `${c.name} (${c.phone || 'No HP'})` 
        }));
    }

    // 2. Parsing Pet Type Data
    if (petTypeResponse.data) {
        const rawData = petTypeResponse.data.data;
        if (rawData && Array.isArray(rawData.data)) {
             petTypes.value = rawData.data; 
        } else if (Array.isArray(rawData)) {
             petTypes.value = rawData; 
        } else {
             petTypes.value = [];
        }
    }
    
  } catch (error) {
    console.error('Gagal mengambil data dropdown:', error);
  } finally {
    loadingDropdowns.value = false;
  }
}

onMounted(() => {
  loadInitialData();
  window.addEventListener('branch-changed', loadInitialData);

  if (route.query.new_pet_for_customer) {
    const customerId = Number(route.query.new_pet_for_customer);
    if (customerId) {
      openNewItemDialog(customerId);
    }
    router.replace({ query: {} });
  }
});

onUnmounted(() => {
  window.removeEventListener('branch-changed', loadInitialData);
});

watch(search, () => {
  options.value.page = 1
  fetchPets()
})

const openNewItemDialog = (customerId: number | null = null) => {
  editedIndex.value = -1
  editedItem.value = { ...defaultItem }
  if (customerId) {
    editedItem.value.customer_id = customerId;
  }
  isDialogVisible.value = true
}

const openEditItemDialog = (item: any) => {
  editedIndex.value = pets.value.indexOf(item)
  editedItem.value = { 
    ...item,
    customer_id: item.customer?.id || null,
    pet_type_id: item.pet_type?.id || null,
    date_of_birth: item.date_of_birth ? new Date(item.date_of_birth).toISOString().split('T')[0] : null
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