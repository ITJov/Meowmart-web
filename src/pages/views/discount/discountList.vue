<template>
  <div>
    <VCard>
      <VCardTitle class="d-flex align-center pa-4">
        <span class="text-h5">Tabel Diskon & Kupon</span>
        <VSpacer />
        <VTextField
          v-model="search"
          density="compact"
          label="Cari Nama / Kode"
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
          Tambah Diskon Baru
        </VBtn>
      </VCardTitle>
    </VCard>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="discounts"
      :items-length="totalDiscounts"
      :loading="loading"
      class="text-no-wrap mt-4"
      @update:options="fetchDiscounts"
    >
      <template #[`item.discount_value`]="{ item }">
        <span v-if="item.discount_type === 'percentage'">{{ (item.discount_value * 100).toFixed(0) }}%</span>
        <span v-else>{{ formatCurrency(item.discount_value) }}</span>
      </template>

      <template #[`item.discount_type`]="{ item }">
        <VChip size="small" :color="item.discount_type === 'percentage' ? 'warning' : 'info'">
          {{ item.discount_type === 'percentage' ? 'Persen' : 'Potongan' }}
        </VChip>
      </template>

      <template #[`item.end_date`]="{ item }">
        {{ item.end_date ? new Date(item.end_date).toLocaleDateString('id-ID') : 'Tidak Terbatas' }}
      </template>

      <template #[`item.is_active`]="{ item }">
        <VChip size="small" :color="item.is_active ? 'success' : 'error'">
          {{ item.is_active ? 'Aktif' : 'Non-Aktif' }}
        </VChip>
      </template>
      
      <template #[`item.actions`]="{ item }">
        <VBtn icon="mdi-pencil" size="small" variant="text" @click="openEditItemDialog(item)" />
        <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
      </template>
    </VDataTableServer>
    
    <VDialog v-model="isDialogVisible" max-width="900px" persistent>
      <DiscountForm
        v-if="isDialogVisible"
        :key="editedItem.id || 'new'"
        :initial-data="editedItem"
        :is-edit-mode="editedIndex > -1"
        @saved="handleSaved"
        @close="isDialogVisible = false"
      />
    </VDialog>
    
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="top">
      {{ snackbar.message }}
    </VSnackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import axios from '../../../plugins/axios'
import * as DiscountFormModule from './addDiscount.vue';
const DiscountForm = (DiscountFormModule as any).default ?? DiscountFormModule;

const loading = ref(true);
const search = ref('');
const totalDiscounts = ref(0);
const discounts = ref<any[]>([]);
const options = ref({ page: 1, itemsPerPage: 10 });
const isDialogVisible = ref(false);
const editedIndex = ref(-1);
const snackbar = ref({ show: false, message: '', color: 'success' });

// State untuk menyimpan data item yang sedang diedit/dibuat
const defaultItem = { 
    id: 0, name: '', code: '', description: '', discount_type: 'percentage', 
    discount_value: 0, min_payment_amount: 0, 
    start_date: new Date().toISOString().substr(0, 10), 
    end_date: null, is_active: true, 
    usage_limit: null, user_limit: 1 
};
const editedItem = ref<any>({ ...defaultItem }); // Menggunakan 'any' untuk kemudahan, tapi interface lebih baik

const headers = [
  { title: 'NAMA DISKON', key: 'name' },
  { title: 'KODE', key: 'code' },
  { title: 'TIPE', key: 'discount_type' },
  { title: 'NILAI', key: 'discount_value' },
  { title: 'MIN. BAYAR', key: 'min_payment_amount' },
  { title: 'BERLAKU HINGGA', key: 'end_date' },
  { title: 'STATUS', key: 'is_active' },
  { title: 'AKSI', key: 'actions', sortable: false },
] as const;

// Helper untuk format mata uang
const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    return activeBranchString ? JSON.parse(activeBranchString).id : null;
}

// === FUNGSI CRUD ===

const showSnackbar = (message: string, color: string = 'success') => {
    snackbar.value = { show: true, message, color };
};

// C: CREATE (Membuka Dialog Tambah Baru)
const openNewItemDialog = () => {
    editedItem.value = { ...defaultItem };
    editedIndex.value = -1;
    isDialogVisible.value = true;
};

// U: UPDATE (Membuka Dialog Edit)
const openEditItemDialog = (item: any) => {
    // Pastikan data item tanggal diubah ke format YYYY-MM-DD
    const itemCopy = { 
        ...item,
        start_date: item.start_date ? new Date(item.start_date).toISOString().split('T')[0] : null,
        end_date: item.end_date ? new Date(item.end_date).toISOString().split('T')[0] : null,
        // Pastikan nilai persentase disajikan sebagai angka penuh (misal 0.15 jadi 15) untuk form
        discount_value: item.discount_type === 'percentage' ? (item.discount_value * 100) : item.discount_value
    };
    editedItem.value = itemCopy;
    editedIndex.value = discounts.value.indexOf(item);
    isDialogVisible.value = true;
};

// R: READ (Fetch Data dari Backend)
const fetchDiscounts = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;

  loading.value = true;
  try {
    const { data } = await axios.get('/api/discounts', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId,
      },
    });
    
    discounts.value = data.data.data;
    totalDiscounts.value = data.data.total;

  } catch (error) {
    console.error('Gagal mengambil data diskon:', error);
  } finally {
    loading.value = false;
  }
};

// D: DELETE (Hapus Data)
const deleteItem = async (item: any) => {
    if (confirm(`Anda yakin ingin menghapus diskon: ${item.name}?`)) {
        loading.value = true;
        try {
            await axios.delete(`/api/discounts/${item.id}`);
            showSnackbar('Diskon berhasil dihapus.', 'success');
            fetchDiscounts();
        } catch (error: any) {
            console.error('Gagal menghapus data:', error);
            const msg = error.response?.data?.message || 'Gagal menghapus diskon.';
            showSnackbar(msg, 'error');
        } finally {
            loading.value = false;
        }
    }
};

// Handler setelah form disimpan (sukses)
const handleSaved = () => {
    isDialogVisible.value = false;
    showSnackbar('Data diskon berhasil disimpan.', 'success');
    fetchDiscounts();
};

// Lifecycle Hooks dan Watchers
onMounted(fetchDiscounts);
watch(search, () => { options.value.page = 1; fetchDiscounts(); });
</script>