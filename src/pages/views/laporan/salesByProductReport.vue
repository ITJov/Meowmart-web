<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Penjualan by Product</span>
      <VSpacer />
      <VBtn color="orange" @click="downloadReport" :disabled="loading || productList.length === 0">
        <VIcon icon="mdi-download" start />
        Download
      </VBtn>
    </VCardTitle>

    <!-- === FILTER === -->
    <VCardText>
      <VRow>
        <!-- Filter Cabang -->
        <VCol cols="12" md="3">
          <VSelect
            v-model="filters.branches_id"
            :items="branchList"
            item-title="name"
            item-value="id"
            label="Pilih Cabang"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>
        <!-- Filter Tanggal Mulai -->
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
        <!-- Filter Tanggal Selesai -->
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
        <!-- Filter Search -->
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
            Terapkan
          </VBtn>
        </VCol>
      </VRow>
    </VCardText>

    <!-- === TABEL DATA === -->
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
      <!-- Kustomisasi Tampilan Kolom -->
      <template #[`item.name`]="{ item }">
        {{ item.name }}
      </template>

      <template #[`item.unit_name`]="{ item }">
        {{ item.unit?.name || 'N/A' }}
      </template>
      
      <template #[`item.total_quantity_sold`]="{ item }">
        <VChip color="primary" variant="tonal">
          {{ item.total_quantity_sold }}
        </VChip>
      </template>

      <!-- Pesan jika tidak ada data -->
      <template #no-data>
        <div class="text-center py-4">
          Tidak ada data penjualan produk yang ditemukan untuk filter yang dipilih.
        </div>
      </template>
    </VDataTableServer>

  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import axios from '@/plugins/axios'; // Pastikan path axios Anda benar

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
  branches_id: null as number | null,
  search: '',
});

// --- Headers Tabel ---
const headers = [
  { title: 'NAMA PRODUK', key: 'name', sortable: false },
  { title: 'SATUAN', key: 'unit_name', sortable: false },
  { title: 'STOK TERJUAL', key: 'total_quantity_sold' }, // 'key' harus cocok dengan alias dari backend
] as const;


// --- Computed ---
const isFilterValid = computed(() => {
  return filters.value.start_date && filters.value.end_date && filters.value.branches_id;
});

// --- Helper Functions ---
const setDefaultDates = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  filters.value.start_date = firstDayOfMonth.toISOString().split('T')[0];
  filters.value.end_date = today.toISOString().split('T')[0];
};

// --- API Calls ---

// 1. Ambil daftar cabang untuk filter
const fetchBranches = async () => {
  try {
    const { data } = await axios.get('/api/branches', { params: { all: true } });
    branchList.value = data.data.data || data.data; 
  } catch (error) {
    console.error('Gagal mengambil daftar cabang:', error);
  }
};

// 2. Ambil data laporan utama
const fetchReport = async () => {
  if (!isFilterValid.value) {
    productList.value = [];
    totalItems.value = 0;
    return;
  }
  
  loading.value = true;
  
  try {
    const { data } = await axios.get('/api/reports/sales-by-product', { // <-- URL API BARU
      params: {
        ...filters.value, // Kirim semua filter
        page: options.value.page,
        per_page: options.value.itemsPerPage,
      },
    });

    if (data.success && data.data) {
      productList.value = data.data.data; // Data dari paginator
      totalItems.value = data.data.total; // Total item dari paginator
    }
  } catch (error: any) {
    console.error('Gagal mengambil data laporan:', error);
    alert(`Terjadi kesalahan: ${error.response?.data?.message || error.message}`);
  } finally {
    loading.value = false;
  }
};

// Fungsi untuk tombol download (placeholder)
const downloadReport = () => {
  alert('Fungsi download belum diimplementasikan.');
};

// --- Lifecycle ---
onMounted(() => {
  setDefaultDates();
  fetchBranches();
  
  // Cek cabang aktif dari localStorage
  const activeBranchString = localStorage.getItem('activeBranch');
  if (activeBranchString) {
    try {
      const activeBranch = JSON.parse(activeBranchString);
      if (activeBranch && activeBranch.id) {
        filters.value.branches_id = activeBranch.id;
        // Otomatis muat laporan untuk cabang aktif
        fetchReport(); 
      }
    } catch(e) {
      console.error("Gagal parse activeBranch dari localStorage", e);
    }
  }
});

// Watcher untuk search (debounce)
let searchTimeout: number;
watch(() => filters.value.search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    options.value.page = 1; // Reset ke halaman 1
    fetchReport();
  }, 500); // Tunda 500ms
});
</script>
