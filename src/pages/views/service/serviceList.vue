<template>
  <div>
    <VCard>
      <VCardTitle class="d-flex align-center pa-4">
        <span class="text-h5">Tabel Pelayanan</span>
        <VSpacer />
        <VTextField
          v-model="search"
          density="compact"
          label="Pencarian"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          hide-details
          clearable
          style="max-width: 300px;"
          class="me-4"
        />
        <VBtn color="primary" @click="openNewItemDialog">
          <VIcon icon="mdi-plus" start />
          Tambah Pelayanan Baru
        </VBtn>
      </VCardTitle>

      <VDataTableServer
        v-model:items-per-page="options.itemsPerPage"
        v-model:page="options.page"
        :headers="headers"
        :items="services"
        :items-length="totalServices"
        :loading="loading"
        class="text-no-wrap"
        @update:options="fetchServices"
      >
        <template #[`item.category`]="{ item }">
          {{ item.category?.name || '-' }}
        </template>
        <template #[`item.price`]="{ item }">
          {{ formatCurrency(item.price) }}
        </template>
        <template #[`item.actions`]="{ item }">
          <div class="d-flex gap-1">
            <VBtn icon="mdi-pencil" size="small" variant="text" @click="openEditItemDialog(item)" />
            <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <!-- Dialog untuk Tambah/Edit Pelayanan -->
    <VDialog v-model="isDialogVisible" max-width="500px" persistent>
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
                    label="Nama Servis"
                    :rules="[v => !!v || 'Nama wajib diisi']"
                    variant="outlined"
                    density="compact"
                  />
                </VCol>
                <VCol cols="12">
                  <!-- DIUBAH: v-model dan :items sekarang menggunakan nama yang benar -->
                  <VSelect
                    v-model="editedItem.category_id"
                    :items="categories"
                    item-title="name"
                    item-value="id"
                    label="Kategori"
                    :rules="[v => !!v || 'Kategori wajib dipilih']"
                    variant="outlined"
                    density="compact"
                  />
                </VCol>
                <VCol cols="12">
                  <VTextField
                    v-model.number="editedItem.price"
                    label="Harga"
                    type="number"
                    prefix="Rp"
                    :rules="[v => v !== null && v !== '' || 'Harga wajib diisi']"
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
          <VBtn color="secondary" @click="closeDialog" variant="text">Batal</VBtn>
          <VBtn color="primary" @click="save" variant="flat" :loading="isSaving">Simpan</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import axios from '../../../plugins/axios'
import type { VForm } from 'vuetify/components';

const services = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalServices = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });
const isSaving = ref(false);

const headers = [
  { title: 'SERVIS', key: 'name' },
  { title: 'KATEGORI', key: 'category', sortable: false },
  { title: 'HARGA', key: 'price' },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const;

const isDialogVisible = ref(false);
const refVForm = ref<VForm>();
const editedIndex = ref(-1);
// DIUBAH: Menggunakan 'category_id'
const editedItem = ref({
  id: 0,
  name: '',
  category_id: null,
  price: 0,
});
const defaultItem = { ...editedItem.value };
const formTitle = computed(() => (editedIndex.value === -1 ? 'Tambah Pelayanan Baru' : 'Edit Pelayanan'));
// DIUBAH: Nama variabel menjadi 'categories'
const categories = ref([]);

const fetchServices = async () => {
  loading.value = true;
  try {
    const { data } = await axios.get('/api/services', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
      },
    });
    if (data && data.data) {
      services.value = data.data.data;
      totalServices.value = data.data.total;
    }
  } catch (error) {
    console.error('Gagal mengambil data layanan:', error);
  } finally {
    loading.value = false;
  }
};

// DIUBAH: Mengambil data dari endpoint categories yang benar
const fetchCategories = async () => {
  try {
    const { data } = await axios.get('/api/categories?all=true');
    if (data && data.data) {
      // Menangani format paginasi dan non-paginasi
      categories.value = data.data.data || data.data;
    }
  } catch (error) {
    console.error('Gagal mengambil kategori:', error);
  }
};

onMounted(() => {
  fetchCategories();
});

watch(search, () => {
  options.value.page = 1;
  fetchServices();
});

const openNewItemDialog = () => {
  editedIndex.value = -1;
  editedItem.value = { ...defaultItem };
  isDialogVisible.value = true;
};

const openEditItemDialog = (item: any) => {
  editedIndex.value = services.value.indexOf(item);
  // Pastikan ID kategori di-set dengan benar
  editedItem.value = { ...item, category_id: item.category?.id || null };
  isDialogVisible.value = true;
};

const closeDialog = () => {
  isDialogVisible.value = false;
};

const save = async () => {
  const { valid } = await refVForm.value!.validate();
  if (!valid) return;

  isSaving.value = true;
  try {
    if (editedIndex.value > -1) {
      await axios.put(`/api/services/${editedItem.value.id}`, editedItem.value);
    } else {
      await axios.post('/api/services', editedItem.value);
    }
    closeDialog();
    fetchServices();
  } catch (error) {
    console.error('Gagal menyimpan layanan:', error);
  } finally {
    isSaving.value = false;
  }
};

const deleteItem = async (item: any) => {
  if (confirm('Apakah Anda yakin ingin menghapus layanan ini?')) {
    loading.value = true;
    try {
      await axios.delete(`/api/services/${item.id}`);
      fetchServices();
    } catch (error) {
      console.error('Gagal menghapus layanan:', error);
    } finally {
      loading.value = false;
    }
  }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);
</script>

