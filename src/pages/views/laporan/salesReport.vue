<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Rekap Penjualan</span>
      <VSpacer />
      <VBtn 
        color="orange" 
        @click="downloadReport" 
        :disabled="loading || salesList.length === 0"
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
            label="Cari No. Invoice / Pelanggan"
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

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="salesList"
      :items-length="totalItems"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchReport"
    >
      <template #[`item.order_date`]="{ item }">
        {{ formatDate(item.order_date) }}
      </template>

      <template v-if="filters.branches_id === 0" #[`item.branch_name`]="{ item }">
        {{ item.branch?.name || 'N/A' }}
      </template>

      <template #[`item.customer_name`]="{ item }">
        {{ item.customer?.name || 'Umum' }}
      </template>
      
      <template #[`item.total`]="{ item }">
        <span class="font-weight-bold">{{ formatCurrency(item.total) }}</span>
      </template>

      <template #[`item.payment_status`]="{ item }">
        <VChip 
          :color="getStatusColor(item.payment_status)" 
          size="small" 
          variant="tonal"
          class="text-uppercase"
        >
          {{ item.payment_status }}
        </VChip>
      </template>

      <template #no-data>
        <div class="text-center py-4">
          Tidak ada data penjualan ditemukan.
        </div>
      </template>
    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import axios from '../../../plugins/axios'

// 1. Interface untuk mendefinisikan tipe Header agar properti 'sortable' dikenali
interface DataTableHeader {
  title: string;
  key: string;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
}

// --- State ---
const loading = ref(false);
const salesList = ref<any[]>([]);
const totalItems = ref(0);
const branchList = ref<any[]>([]);

const options = ref({
  page: 1,
  itemsPerPage: 10,
});

const filters = ref({
  start_date: '',
  end_date: '',
  branches_id: 0 as number | null, // Default 0 untuk Semua Cabang
  search: '',
});

// --- Computed ---

// Menambahkan opsi "Semua Cabang" ke daftar select
const branchListWithAll = computed(() => {
  return [
    { id: 0, name: 'Semua Cabang' },
    ...branchList.value,
  ];
});

// Validasi filter (Minimal tanggal harus terisi)
const isFilterValid = computed(() => {
  return filters.value.start_date && filters.value.end_date;
});

// Header dinamis dengan tipe data eksplisit DataTableHeader[]
const headers = computed((): DataTableHeader[] => {
  const dynamicHeaders: DataTableHeader[] = [
    { title: 'TANGGAL TRANSAKSI', key: 'order_date', sortable: true },
  ];

  // Tambahkan kolom CABANG jika "Semua Cabang" dipilih
  if (filters.value.branches_id === 0) {
    dynamicHeaders.push({ title: 'CABANG', key: 'branch_name', sortable: false });
  }

  dynamicHeaders.push(
    { title: 'NO. INVOICE', key: 'invoice_number', sortable: true },
    { title: 'PELANGGAN', key: 'customer_name', sortable: false },
    { title: 'TOTAL', key: 'total', sortable: true },
    { title: 'STATUS', key: 'payment_status', sortable: true }
  );

  return dynamicHeaders;
});

// --- Helper Functions ---

const setDefaultDates = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  filters.value.start_date = firstDay.toISOString().split('T')[0];
  filters.value.end_date = today.toISOString().split('T')[0];
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(value || 0);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const getStatusColor = (status: string) => {
  const s = status?.toLowerCase();
  if (s === 'paid') return 'success';
  if (s === 'unpaid') return 'error';
  if (s === 'partial') return 'warning';
  return 'grey';
};

// --- API Calls ---

const fetchBranches = async () => {
  try {
    const { data } = await axios.get('/api/branches', { params: { all: true } });
    branchList.value = data.data.data || data.data;
  } catch (error) {
    console.error('Gagal mengambil cabang:', error);
  }
};

const fetchReport = async () => {
  if (!isFilterValid.value) return;
  
  loading.value = true;
  try {
    const { data } = await axios.get('/api/reports/sales', {
      params: {
        ...filters.value,
        page: options.value.page,
        per_page: options.value.itemsPerPage,
      },
    });

    if (data.success) {
      salesList.value = data.data.data;
      totalItems.value = data.data.total;
    }
  } catch (error: any) {
    alert(`Error: ${error.response?.data?.message || 'Gagal memuat data'}`);
  } finally {
    loading.value = false;
  }
};

const downloadReport = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/reports/sales/download', {
      params: filters.value,
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sales_Report_${filters.value.start_date}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    alert('Gagal mengunduh file.');
  } finally {
    loading.value = false;
  }
};

// --- Lifecycle & Watchers ---

onMounted(() => {
  setDefaultDates();
  fetchBranches();
  
  const activeBranch = localStorage.getItem('activeBranch');
  if (activeBranch) {
    const branch = JSON.parse(activeBranch);
    filters.value.branches_id = branch.id;
  }
  fetchReport();
});

// Debounce search
let searchTimeout: any;
watch(() => filters.value.search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    options.value.page = 1;
    fetchReport();
  }, 500);
});
</script>