<template>
  <div>
    <VCard>
      <VCardTitle class="d-flex align-center pa-4">
        <span class="text-h5">Manajemen Tarif Pajak</span>
        <VSpacer />
        <VTextField
          v-model="search"
          density="compact"
          label="Cari Nama Pajak"
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
          Tambah Tarif Baru
        </VBtn>
      </VCardTitle>
    </VCard>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="taxes"
      :items-length="totalTaxes"
      :loading="loading"
      class="text-no-wrap mt-4"
      @update:options="fetchTaxes"
    >
      <template #[`item.rate`]="{ item }">
        <VChip color="success">{{ item.rate }}%</VChip>
      </template>

      <template #[`item.actions`]="{ item }">
        <VBtn icon="mdi-pencil" size="small" variant="text" @click="openEditItemDialog(item)" />
        <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
      </template>
    </VDataTableServer>

    <!-- DIALOG TAMBAH/EDIT PAJAK -->
    <VDialog v-model="isDialogVisible" max-width="500px" persistent>
      <VCard :loading="isSaving">
        <VCardTitle class="pa-4 bg-grey-lighten-4">
          <span class="text-h5">{{ isEditMode ? 'Edit Tarif Pajak' : 'Tambah Tarif Baru' }}</span>
        </VCardTitle>
        <VCardText>
          <VForm ref="refVForm" @submit.prevent="save">
            <VTextField
              v-model="editedItem.name"
              label="Nama Pajak (Contoh: PPN)"
              :rules="[v => !!v || 'Nama wajib diisi']"
              variant="outlined" density="compact" class="mt-4"
            />
            <VTextField
              v-model.number="editedItem.rate"
              label="Tarif Pajak (%)"
              type="number"
              :rules="[v => (v !== null && v >= 0 && v <= 100) || 'Tarif harus antara 0-100']"
              variant="outlined" density="compact" prefix="%"
            />
          </VForm>
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn color="secondary" variant="text" @click="closeDialog">Batal</VBtn>
          <VBtn color="primary" variant="flat" @click="save" :loading="isSaving">Simpan</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    
    <!-- Snackbar untuk notifikasi -->
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="top">
      {{ snackbar.message }}
    </VSnackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'; // PERBAIKAN: Tambahkan 'computed'
import axios from '@/plugins/axios';
import type { VForm } from 'vuetify/components';

const loading = ref(true);
const isSaving = ref(false);
const search = ref('');
const taxes = ref<any[]>([]);
const totalTaxes = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });
const isDialogVisible = ref(false);
const editedIndex = ref(-1);
const refVForm = ref<VForm>();
const snackbar = ref({ show: false, message: '', color: 'success' });

const defaultItem = { id: 0, name: '', rate: 0 };
const editedItem = ref({ ...defaultItem });

const isEditMode = computed(() => editedIndex.value > -1);

const headers = [
  { title: 'NAMA PAJAK', key: 'name' },
  { title: 'TARIF', key: 'rate' },
  { title: 'AKSI', key: 'actions', sortable: false },
] as const;

const showSnackbar = (message: string, color: string = 'success') => {
    snackbar.value = { show: true, message, color };
};

const fetchTaxes = async () => {
  // Karena pajak biasanya global, kita tidak perlu branches_id di sini
  loading.value = true;
  try {
    const { data } = await axios.get('/api/taxes', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
      },
    });
    
    // Data API di sini adalah paginasi
    taxes.value = data.data.data;
    totalTaxes.value = data.data.total;

  } catch (error) {
    console.error('Gagal mengambil data pajak:', error);
  } finally {
    loading.value = false;
  }
};

const openNewItemDialog = () => {
    editedItem.value = { ...defaultItem };
    editedIndex.value = -1;
    isDialogVisible.value = true;
};

const openEditItemDialog = (item: any) => {
    editedItem.value = { ...item };
    editedIndex.value = taxes.value.indexOf(item);
    isDialogVisible.value = true;
};

const closeDialog = () => {
    isDialogVisible.value = false;
    refVForm.value?.resetValidation();
};

const save = async () => {
    const { valid } = await refVForm.value!.validate();
    if (!valid) return;
    
    isSaving.value = true;
    try {
        if (isEditMode.value) {
            await axios.put(`/api/taxes/${editedItem.value.id}`, editedItem.value);
        } else {
            await axios.post('/api/taxes', editedItem.value);
        }
        
        showSnackbar('Tarif pajak berhasil disimpan.', 'success');
        closeDialog();
        fetchTaxes();
    } catch (error: any) {
        console.error('Gagal menyimpan pajak:', error);
        alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
        isSaving.value = false;
    }
};

const deleteItem = async (item: any) => {
    if (confirm(`Anda yakin ingin menghapus tarif pajak: ${item.name}?`)) {
        loading.value = true;
        try {
            await axios.delete(`/api/taxes/${item.id}`);
            showSnackbar('Tarif pajak berhasil dihapus.', 'success');
            fetchTaxes();
        } catch (error: any) {
            console.error('Gagal menghapus data:', error);
            const msg = error.response?.data?.message || 'Gagal menghapus pajak.';
            showSnackbar(msg, 'error');
        } finally {
            loading.value = false;
        }
    }
};

// Lifecycle Hooks dan Watchers
onMounted(fetchTaxes);
watch(search, () => { options.value.page = 1; fetchTaxes(); });

</script>