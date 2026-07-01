<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Rekap Stok</span>
      <VSpacer />
      <VBtn 
        color="orange" 
        @click="downloadReport" 
        :disabled="loading || stockList.length === 0"
      >
        <VIcon icon="mdi-download" start />
        Download
      </VBtn>
    </VCardTitle>

    <VCardText>
      <VRow align="center">
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
          />
        </VCol>
        
        <VCol cols="12" md="3">
          <VTextField
            v-model="filters.search"
            label="Cari Produk atau SKU"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>

        <VCol cols="12" md="2">
          <VSwitch
            v-model="filters.low_stock_only"
            label="Minim Stok"
            color="error"
            hide-details
            density="compact"
            @change="resetAndFetch"
          />
        </VCol>

        <VCol cols="12" md="2">
          <VSwitch
            v-model="filters.expiring_soon"
            label="Hampir Expired"
            color="warning"
            hide-details
            density="compact"
            @change="resetAndFetch"
          />
        </VCol>

        <VCol cols="12" md="2">
          <VBtn 
            @click="resetAndFetch" 
            :disabled="loading" 
            :loading="loading"
            color="primary"
            block
          >
            Filter
          </VBtn>
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

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
      <template #[`item.product_name`]="{ item }">
        <div class="d-flex flex-column">
          <span class="font-weight-medium">{{ item.product?.name || 'N/A' }}</span>
          <small class="text-grey">{{ item.product?.item_code || '-' }}</small>
        </div>
      </template>

      <template v-if="filters.branches_id === 0" #[`item.branch_name`]="{ item }">
        <VChip size="x-small" variant="outlined" color="secondary">
          {{ item.branch?.name || 'N/A' }}
        </VChip>
      </template>

      <template #[`item.current_stock`]="{ item }">
        <VChip 
          :color="item.current_stock > (item.stock_alert || 0) ? 'success' : 'error'" 
          variant="tonal" 
          size="small"
        >
          {{ item.current_stock }} {{ item.product?.unit?.name || '' }}
        </VChip>
      </template>

      <template #[`item.expiry_date`]="{ item }">
        <div v-if="item.nearest_expiry">
          <VChip 
            size="small" 
            :color="isNearExpiry(item.nearest_expiry) ? 'warning' : 'grey'"
            variant="flat"
          >
            {{ new Date(item.nearest_expiry).toLocaleDateString('id-ID') }}
          </VChip>
        </div>
        <span v-else class="text-grey">-</span>
      </template>

      <template #no-data>
        <div class="text-center py-4 text-grey">
          Tidak ada data stok ditemukan.
        </div>
      </template>
    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import axios from '../../../plugins/axios'

// --- Interface ---
interface DataTableHeader {
  title: string;
  key: string;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
}

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
  branches_id: 0 as number | null,
  search: '',
  low_stock_only: false,
  expiring_soon: false, // State baru untuk filter expired
});

// --- Computed ---
const branchListWithAll = computed(() => [
  { id: 0, name: 'Semua Cabang' },
  ...branchList.value,
]);

const headers = computed((): DataTableHeader[] => {
  const dynamicHeaders: DataTableHeader[] = [
    { title: 'PRODUK', key: 'product_name', sortable: false },
  ];

  if (filters.value.branches_id === 0) {
    dynamicHeaders.push({ title: 'CABANG', key: 'branch_name', sortable: false });
  }

  dynamicHeaders.push(
    { title: 'KATEGORI', key: 'product.category.name', sortable: false },
    { title: 'STOK', key: 'current_stock', align: 'center' },
    { title: 'EXP TERDEKAT', key: 'expiry_date', align: 'center' }, // Kolom baru
    { title: 'HARGA BELI', key: 'purchase_price', align: 'end' }
  );

  return dynamicHeaders;
});

// --- Helpers ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(value || 0);
};

const isNearExpiry = (dateString: string) => {
  const expDate = new Date(dateString);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30; // Tandai kuning jika <= 30 hari
};

const resetAndFetch = () => {
  options.value.page = 1;
  fetchReport();
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
  loading.value = true;
  try {
    const { data } = await axios.get('/api/reports/stock-recap', {
      params: {
        branches_id: filters.value.branches_id,
        search: filters.value.search,
        low_stock_only: filters.value.low_stock_only ? 1 : 0,
        expiring_soon: filters.value.expiring_soon ? 1 : 0, // Kirim ke backend
        page: options.value.page,
        per_page: options.value.itemsPerPage,
      },
    });

    if (data.success) {
      stockList.value = data.data.data;
      totalItems.value = data.data.total;
    }
  } catch (error: any) {
    console.error('Fetch Error:', error);
  } finally {
    loading.value = false;
  }
};

const downloadReport = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/reports/stock-recap/download', {
      params: {
        ...filters.value,
        low_stock_only: filters.value.low_stock_only ? 1 : 0,
        expiring_soon: filters.value.expiring_soon ? 1 : 0,
      },
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Stok_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    alert('Gagal mengunduh laporan.');
  } finally {
    loading.value = false;
  }
};

// --- Lifecycle & Watcher ---
onMounted(() => {
  fetchBranches();
  
  // Set default branch dari localStorage jika ada
  const activeBranchString = localStorage.getItem('activeBranch');
  if (activeBranchString) {
    try {
      const activeBranch = JSON.parse(activeBranchString);
      filters.value.branches_id = activeBranch.id;
    } catch(e) {}
  }
  
  fetchReport();
});

let searchTimeout: any;
watch(() => filters.value.search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    resetAndFetch();
  }, 500);
});
</script>