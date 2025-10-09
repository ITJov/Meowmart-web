<template>
  <VCard>
    <!-- Judul, Pencarian, dan Tombol Tambah -->
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Kategori</span>
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
        Tambah Kategori Baru
      </VBtn>
    </VCardTitle>

    <!-- Tabel Data -->
    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="categories"
      :items-length="totalCategories"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchCategories"
    >
      <!-- Kustomisasi Tampilan Kolom -->
      <template #[`item.name`]="{ item }">
        <div class="d-flex align-center py-2">
          <span class="font-weight-medium">{{ item.name }}</span>
        </div>
      </template>

      <template #[`item.logo`]="{ item }">
        <VAvatar size="40" class="my-2">
          <VImg :src="item.image_url || 'https://placehold.co/40x40/eeeeee/cccccc?text=N/A'" />
        </VAvatar>
      </template>

      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1">
          <VBtn icon="mdi-pencil" size="small" variant="text" @click="openEditItemDialog(item)" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
        </div>
      </template>
    </VDataTableServer>
  </VCard>

  <!-- Dialog untuk Tambah/Edit -->
  <VDialog v-model="isDialogVisible" max-width="500px" persistent>
    <VCard>
      <VCardTitle class="pa-4 bg-grey-lighten-4">
        <span class="text-h5">{{ formTitle }}</span>
      </VCardTitle>
      <VCardText class="pt-4">
        <VForm ref="refVForm" @submit.prevent="save">
          <VTextField
            v-model="editedItem.name"
            label="Nama Kategori"
            :rules="[v => !!v || 'Nama wajib diisi']"
            variant="outlined"
            density="compact"
            class="mb-4"
          />
          <VFileInput
            v-model="editedItem.image"
            label="Logo Kategori"
            accept="image/*"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-camera"
          />
          <div v-if="isEditMode && editedItem.image_url" class="mt-2">
            <span class="text-caption">Logo saat ini:</span>
            <VImg :src="editedItem.image_url" width="80" class="mt-1" />
          </div>
        </VForm>
      </VCardText>
      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn color="secondary" @click="closeDialog" variant="text">Batal</VBtn>
        <VBtn color="primary" @click="save" variant="flat" :loading="isSaving">Simpan</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { VForm } from 'vuetify/components';
import axios from '@/plugins/axios';

// State untuk Tabel
const categories = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalCategories = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

// State untuk Dialog
const isDialogVisible = ref(false);
const isSaving = ref(false);
const refVForm = ref<VForm>();
const editedIndex = ref(-1);
const editedItem = ref({
  id: 0,
  name: '',
  image: null as File[] | null, // VFileInput models as an array
  image_url: null as string | null,
});
const defaultItem = { ...editedItem.value };

// Computed Properties
const formTitle = computed(() => (editedIndex.value === -1 ? 'Tambah Kategori' : 'Edit Kategori'));
const isEditMode = computed(() => editedIndex.value > -1);

// Definisi Header Tabel
const headers = [
  { title: 'NAMA', key: 'name', sortable: false, width: '60%' },
  { title: 'KATEGORI LOGO', key: 'logo', sortable: false },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const;

// API Call
const fetchCategories = async () => {
  loading.value = true;
  try {
    const { data } = await axios.get('/api/categories', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
      },
    });
    categories.value = data.data.data;
    totalCategories.value = data.data.total;
  } catch (error) {
    console.error('Gagal mengambil data kategori:', error);
  } finally {
    loading.value = false;
  }
};

// Aksi Dialog
const openNewItemDialog = () => {
  editedIndex.value = -1;
  editedItem.value = { ...defaultItem };
  isDialogVisible.value = true;
};

const openEditItemDialog = (item: any) => {
  editedIndex.value = categories.value.indexOf(item);
  editedItem.value = { ...item, image: null }; // Reset file input
  isDialogVisible.value = true;
};

const closeDialog = () => {
  isDialogVisible.value = false;
};

// Aksi CRUD
const save = async () => {
  const { valid } = await refVForm.value!.validate();
  if (!valid) return;

  isSaving.value = true;
  const formData = new FormData();
  formData.append('name', editedItem.value.name);
  if (editedItem.value.image && editedItem.value.image[0]) {
    formData.append('image', editedItem.value.image[0]);
  }

  const config = { headers: { 'Content-Type': 'multipart/form-data' } };

  try {
    if (isEditMode.value) {
      formData.append('_method', 'PUT');
      await axios.post(`/api/categories/${editedItem.value.id}`, formData, config);
    } else {
      await axios.post('/api/categories', formData, config);
    }
    await fetchCategories();
  } catch (error) {
    console.error('Gagal menyimpan data:', error);
  } finally {
    isSaving.value = false;
    closeDialog();
  }
};

const deleteItem = async (item: any) => {
  if (confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
    try {
      await axios.delete(`/api/categories/${item.id}`);
      await fetchCategories();
    } catch (error) {
      console.error('Gagal menghapus data:', error);
    }
  }
};

// Lifecycle & Watcher
onMounted(fetchCategories);

watch(search, () => {
  options.value.page = 1;
  fetchCategories();
});
</script>
