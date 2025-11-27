<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Pengingat Stok</span>
      <VSpacer />
      <VBtn color="orange" @click="downloadReport" :disabled="loading || stockList.length === 0">
        <VIcon icon="mdi-download" start />
        Download
      </VBtn>
    </VCardTitle>

    <!-- === FILTER === -->
    <VCardText>
      <VRow>
        <!-- Filter Cabang -->
        <VCol cols="12" md="4">
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
        <!-- Filter Search -->
        <VCol cols="12" md="4">
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
        <!-- Tombol Terapkan -->
        <VCol cols="12" md="4">
          <VBtn 
            @click="() => { options.page = 1; fetchReport(); }" 
            :disabled="!filters.branches_id || loading" 
            :loading="loading"
            color="primary"
            block
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
      :items="stockList"
      :items-length="totalItems"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchReport"
    >
      <!-- Kustomisasi Tampilan Kolom -->
      <template #[`item.product_name`]="{ item }">
        {{ item.product?.name || 'N/A' }}
      </template>

      <!-- Variasi bisa diisi data lain jika ada -->
      <template #[`item.variant`]="{ item }">
        {{ item.product?.variant || '-' }}
      </template>
      
      <template #[`item.current_stock`]="{ item }">
        <VChip :color="item.current_stock <= item.stock_alert ? 'error' : 'success'" size="small">
          {{ item.current_stock }}
        </VChip>
      </template>
      
      <template #[`item.stock_alert`]="{ item }">
        {{ item.stock_alert }}
      </template>

      <!-- Pesan jika tidak ada data -->
      <template #no-data>
        <div class="text-center py-4">
          Tidak ada produk yang perlu di-restock untuk cabang ini.
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
const stockList = ref<any[]>([]);
const totalItems = ref(0);
const branchList = ref<any[]>([]);
const options = ref({
  page: 1,
  itemsPerPage: 10,
});
const filters = ref({
  branches_id: null as number | null,
  search: '',
});

// --- Headers Tabel ---
const headers = [
  { title: 'NAMA PRODUK', key: 'product_name', sortable: false },
  // { title: 'NAMA VARIAN', key: 'variant', sortable: false }, // Hapus jika tidak ada
  { title: 'STOK SAAT INI', key: 'current_stock' },
  { title: 'PENGINGAT STOK', key: 'stock_alert' },
] as const;

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
  if (!filters.value.branches_id) {
    // Jangan fetch jika cabang belum dipilih
    stockList.value = [];
    totalItems.value = 0;
    return;
  }
  
  loading.value = true;
  
  try {
    const { data } = await axios.get('/api/reports/minimum-stock', {
      params: {
        ...filters.value, // Kirim semua filter
        page: options.value.page,
        per_page: options.value.itemsPerPage,
      },
    });

    if (data.success && data.data) {
      stockList.value = data.data.data; // Data dari paginator
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
