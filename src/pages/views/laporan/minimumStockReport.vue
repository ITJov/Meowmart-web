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

    <VCardText>
      <VRow>
        <VCol cols="12" md="4">
          <VSelect
            v-model="filters.branches_id"
            :items="branchListWithAll" item-title="name"
            item-value="id"
            label="Pilih Cabang"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>
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
        <VCol cols="12" md="4">
          <VBtn 
            @click="() => { options.page = 1; fetchReport(); }" 
            :disabled="!isFilterValid || loading" :loading="loading"
            color="primary"
            block
          >
            Terapkan
          </VBtn>
        </VCol>
      </VRow>
    </VCardText>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers" :items="stockList"
      :items-length="totalItems"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchReport"
    >
      <template #[`item.product_name`]="{ item }">
        {{ item.product?.name || 'N/A' }}
      </template>

      <template v-if="filters.branches_id === 0" #[`item.branch_name`]="{ item }">
        {{ item.branch?.name || 'N/A' }}
      </template>
      
      <template #[`item.current_stock`]="{ item }">
        <VChip :color="item.current_stock <= item.stock_alert ? 'error' : 'success'" size="small">
          {{ item.current_stock }}
        </VChip>
      </template>
      
      <template #[`item.stock_alert`]="{ item }">
        {{ item.stock_alert }}
      </template>

      <template #no-data>
        <div class="text-center py-4">
          Tidak ada produk yang perlu di-restock untuk filter yang dipilih.
        </div>
      </template>
    </VDataTableServer>

  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import axios from '@/plugins/axios'; 

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
  branches_id: 0 as number | null, // Default ke 0 (Semua Cabang)
  search: '',
});

// --- Computed ---

// **PERUBAHAN 1: Daftar Cabang + Opsi Semua Cabang**
const branchListWithAll = computed(() => {
  return [
    { id: 0, name: 'Semua Cabang' },
    ...branchList.value,
  ];
});

// **PERUBAHAN 2: Validasi Filter**
// Cukup memastikan branches_id tidak null, yang mana akan default ke 0.
const isFilterValid = computed(() => {
  return filters.value.branches_id !== null;
});

// **PERUBAHAN 3: Headers Tabel Dinamis**
const staticHeaders = [
  { title: 'NAMA PRODUK', key: 'product_name', sortable: false },
  { title: 'STOK SAAT INI', key: 'current_stock' },
  { title: 'PENGINGAT STOK', key: 'stock_alert' },
];

const headers = computed(() => {
    let finalHeaders = [...staticHeaders];
    
    if (filters.value.branches_id === 0) {
        // Sisipkan header cabang setelah Nama Produk
        finalHeaders.splice(1, 0, { title: 'CABANG', key: 'branch_name', sortable: false });
    }
    return finalHeaders;
});

// --- API Calls ---

const fetchBranches = async () => {
  try {
    const { data } = await axios.get('/api/branches', { params: { all: true } });
    branchList.value = data.data.data || data.data; 
    
    // Set default ke 0 jika belum ada yang terpilih
    if (filters.value.branches_id === null) {
      filters.value.branches_id = 0;
    }
  } catch (error) {
    console.error('Gagal mengambil daftar cabang:', error);
  }
};

const fetchReport = async () => {
  if (!isFilterValid.value) { // Gunakan isFilterValid
    stockList.value = [];
    totalItems.value = 0;
    return;
  }
  
  loading.value = true;
  
  try {
    // **PERUBAHAN 4: Pastikan branches_id terkirim sebagai 0 jika null/tidak dipilih**
    const paramsToSend = {
      ...filters.value, 
      page: options.value.page,
      per_page: options.value.itemsPerPage,
      branches_id: filters.value.branches_id || 0,
    };

    const { data } = await axios.get('/api/reports/minimum-stock', {
      params: paramsToSend,
    });

    if (data.success && data.data) {
      stockList.value = data.data.data; 
      totalItems.value = data.data.total; 
    }
  } catch (error: any) {
    console.error('Gagal mengambil data laporan:', error);
    alert(`Terjadi kesalahan: ${error.response?.data?.message || error.message}`);
  } finally {
    loading.value = false;
  }
};

const downloadReport = async () => {
  if (!isFilterValid.value) {
    alert('Silakan pilih cabang atau "Semua Cabang" untuk mengunduh laporan.');
    return;
  }

  loading.value = true;
  try {
    // **PERUBAHAN 5: Pastikan branches_id terkirim sebagai 0 jika null/tidak dipilih**
    const paramsToSend = {
      ...filters.value, 
      branches_id: filters.value.branches_id || 0,
    };
    
    const response = await axios.get('/api/reports/minimum-stock/download', {
      params: paramsToSend, 
      responseType: 'blob', 
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = `Laporan_Stok_Minimum_${paramsToSend.branches_id}.xlsx`; 
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch.length > 1) {
        filename = filenameMatch[1];
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    alert(`Laporan "${filename}" berhasil diunduh!`);
  } catch (error: any) {
    console.error('Gagal mengunduh laporan:', error);
    alert(`Terjadi kesalahan saat mengunduh: ${error.message}`);
  } finally {
    loading.value = false;
  }
};


// --- Lifecycle ---
onMounted(() => {
  fetchBranches();
  
  const activeBranchString = localStorage.getItem('activeBranch');
  let branchIdFromLocalStorage: number | null = null;
  
  if (activeBranchString) {
    try {
      const activeBranch = JSON.parse(activeBranchString);
      if (activeBranch && activeBranch.id) {
        branchIdFromLocalStorage = activeBranch.id;
      }
    } catch(e) {
      console.error("Gagal parse activeBranch dari localStorage", e);
    }
  }
  
  // Gunakan ID Cabang dari Local Storage, atau 0 (Semua Cabang) jika tidak ada
  filters.value.branches_id = branchIdFromLocalStorage || 0;
  
  // Otomatis muat laporan untuk cabang aktif/semua cabang
  fetchReport(); 
});

// Watcher untuk search (debounce)
let searchTimeout: number;
watch(() => filters.value.search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    options.value.page = 1; 
    fetchReport();
  }, 500); 
});
</script>