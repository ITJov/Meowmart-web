<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Laporan Penjualan per Produk</span>
      <VSpacer />
      <VBtn 
        color="orange" 
        @click="downloadReport" 
        :disabled="loading || productList.length === 0"
      >
        <VIcon icon="mdi-download" start />
        Download
      </VBtn>
    </VCardTitle>

    <VCardText>
      <VRow>
        <VCol cols="12" md="3">
          <VSelect
            v-model="filters.branches_id"
            :items="branchListWithAll"
            item-title="name"
            item-value="id"
            label="Pilih Cabang"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>
        <VCol cols="12" md="3">
          <VTextField
            v-model="filters.start_date"
            type="date"
            label="Tanggal Mulai"
            variant="outlined"
            density="compact"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="3">
          <VTextField
            v-model="filters.end_date"
            type="date"
            label="Tanggal Selesai"
            variant="outlined"
            density="compact"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="3">
          <VTextField
            v-model="filters.search"
            label="Cari Nama Produk"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>
      </VRow>
      <VRow>
        <VCol>
          <VBtn 
            @click="() => { options.page = 1; fetchReport(); }" 
            :disabled="!isFilterValid || loading" 
            :loading="loading"
            color="primary"
          >
            Terapkan Filter
          </VBtn>
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="productList"
      :items-length="totalItems"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchReport"
    >
      <template #[`item.name`]="{ item }">
        <span class="font-weight-medium">{{ item.name }}</span>
      </template>

      <template #[`item.unit_name`]="{ item }">
        {{ item.unit?.name || item.unit?.short_name || 'N/A' }}
      </template>
      
      <template #[`item.total_quantity_sold`]="{ item }">
        <VChip color="primary" variant="tonal" size="small">
          {{ item.total_quantity_sold }}
        </VChip>
      </template>

      <template #no-data>
        <div class="text-center py-4">
          Tidak ada data penjualan produk ditemukan untuk filter ini.
        </div>
      </template>
    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import axios from '@/plugins/axios';

// --- Interface untuk Type Safety ---
interface DataTableHeader {
  title: string;
  key: string;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
}

// --- State ---
const loading = ref(false);
const productList = ref<any[]>([]);
const totalItems = ref(0);
const branchList = ref<any[]>([]);

const options = ref({
  page: 1,
  itemsPerPage: 10,
});

const filters = ref({
  start_date: '',
  end_date: '',
  branches_id: 0 as number | null, // Default 0 untuk "Semua Cabang"
  search: '',
});

// --- Computed ---

// Menambahkan opsi "Semua Cabang"
const branchListWithAll = computed(() => {
  return [
    { id: 0, name: 'Semua Cabang' },
    ...branchList.value,
  ];
});

// Validasi filter (Tanggal wajib ada)
const isFilterValid = computed(() => {
  return filters.value.start_date && filters.value.end_date;
});

// Definisi Header Tabel dengan Tipe Eksplisit
const headers = computed((): DataTableHeader[] => {
  return [
    { title: 'NAMA PRODUK', key: 'name', sortable: true },
    { title: 'SATUAN', key: 'unit_name', sortable: false },
    { title: 'TOTAL TERJUAL', key: 'total_quantity_sold', align: 'end', sortable: true },
  ];
});

// --- Helper Functions ---

const setDefaultDates = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  filters.value.start_date = firstDay.toISOString().split('T')[0];
  filters.value.end_date = today.toISOString().split('T')[0];
};

// --- API Calls ---

const fetchBranches = async () => {
  try {
    const { data } = await axios.get('/api/branches', { params: { all: true } });
    branchList.value = data.data.data || data.data;
  } catch (error) {
    console.error('Gagal mengambil daftar cabang:', error);
  }
};

const fetchReport = async () => {
  if (!isFilterValid.value) return;
  
  loading.value = true;
  
  try {
    const { data } = await axios.get('/api/reports/sales-by-product', {
      params: {
        start_date: filters.value.start_date,
        end_date: filters.value.end_date,
        search: filters.value.search,
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        branches_id: filters.value.branches_id === 0 ? null : filters.value.branches_id,
      },
    });

    if (data.success) {
      productList.value = data.data.data;
      totalItems.value = data.data.total;
    }
  } catch (error: any) {
    // Tambahkan log untuk melihat detail error dari Laravel
    console.error('Detail Error:', error.response?.data);
    alert(`Kesalahan: ${error.response?.data?.message || 'Gagal memuat data'}`);
  } finally {
    loading.value = false;
  }
};

const downloadReport = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/reports/sales-by-product/download', {
      params: {
        ...filters.value,
        branches_id: filters.value.branches_id === 0 ? null : filters.value.branches_id,
      },
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Produk_${filters.value.start_date}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert('Gagal mengunduh laporan.');
  } finally {
    loading.value = false;
  }
};

// --- Lifecycle & Watchers ---

onMounted(() => {
  setDefaultDates();
  fetchBranches();
  
  // Ambil cabang dari storage jika ada
  const activeBranchString = localStorage.getItem('activeBranch');
  if (activeBranchString) {
    const activeBranch = JSON.parse(activeBranchString);
    filters.value.branches_id = activeBranch.id;
  }
  
  fetchReport();
});

// Debounce pencarian
let searchTimeout: any;
watch(() => filters.value.search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    options.value.page = 1;
    fetchReport();
  }, 500);
});
</script>