<template>
  <VContainer fluid>
    <VRow class="match-height mb-4">
      <VCol cols="12" md="4">
        <VCard color="error" theme="dark" elevation="3" @click="showDetails('out')" style="cursor: pointer;">
          <div class="d-flex flex-no-wrap justify-space-between">
            <div>
              <VCardTitle class="text-h6">Stok Habis</VCardTitle>
              <VCardSubtitle>Klik untuk lihat detail produk</VCardSubtitle>
              <VCardText class="text-h4 font-weight-bold">
                {{ stats.inventory_alerts.out_of_stock }} <small class="text-subtitle-1">Produk</small>
              </VCardText>
            </div>
            <VIcon icon="tabler-package-off" size="80" class="ma-4 opacity-50" />
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="4">
        <VCard color="warning" theme="dark" elevation="3" @click="showDetails('low')" style="cursor: pointer;">
          <div class="d-flex flex-no-wrap justify-space-between">
            <div>
              <VCardTitle class="text-h6">Stok Menipis</VCardTitle>
              <VCardSubtitle>Stok di bawah 10 unit</VCardSubtitle>
              <VCardText class="text-h4 font-weight-bold">
                {{ stats.inventory_alerts.low_stock }} <small class="text-subtitle-1">Produk</small>
              </VCardText>
            </div>
            <VIcon icon="tabler-alert-triangle" size="80" class="ma-4 opacity-50" />
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="4">
        <VCard color="deep-orange" theme="dark" elevation="3" @click="showDetails('exp')" style="cursor: pointer;">
          <div class="d-flex flex-no-wrap justify-space-between">
            <div>
              <VCardTitle class="text-h6">Hampir Kadaluwarsa</VCardTitle>
              <VCardSubtitle>Exp dalam 30 hari ke depan</VCardSubtitle>
              <VCardText class="text-h4 font-weight-bold">
                {{ stats.inventory_alerts.near_expired }} <small class="text-subtitle-1">Batch</small>
              </VCardText>
            </div>
            <VIcon icon="tabler-calendar-off" size="80" class="ma-4 opacity-50" />
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="match-height">
      <VCol cols="12" md="3" sm="6">
        <VCard>
          <VCardTitle class="text-subtitle-1">Total Penjualan</VCardTitle>
          <VCardText>
            <h4 class="text-h4 mb-1">{{ formatCurrency(stats.kpi.total_sales) }}</h4>
            <span class="text-caption text-success">Bulan Ini</span>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="3" sm="6">
        <VCard>
          <VCardTitle class="text-subtitle-1">Total Pengeluaran</VCardTitle>
          <VCardText>
            <h4 class="text-h4 mb-1">{{ formatCurrency(stats.kpi.total_purchases) }}</h4>
            <span class="text-caption text-warning">Bulan Ini</span>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="3" sm="6">
        <VCard>
          <VCardTitle class="text-subtitle-1">Pembayaran Keluar</VCardTitle>
          <VCardText>
            <h4 class="text-h4 mb-1">{{ formatCurrency(stats.kpi.payments_out) }}</h4>
            <span class="text-caption text-error">Ke Supplier</span>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="3" sm="6">
        <VCard>
          <VCardTitle class="text-subtitle-1">Pembayaran Masuk</VCardTitle>
          <VCardText>
            <h4 class="text-h4 mb-1">{{ formatCurrency(stats.kpi.payments_in) }}</h4>
            <span class="text-caption text-info">Dari Pelanggan</span>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="match-height mt-4">
      <VCol cols="12" lg="8">
        <VCard title="Tren Penjualan vs Pembelian (6 Bulan Terakhir)">
          <VCardText>
            <Bar 
              v-if="!loading && stats.monthly_report.length > 0" 
              :options="trendChartOptions" 
              :data="trendChartData" 
              style="height: 400px;" 
            />
            <div v-else class="d-flex align-center justify-center" style="height: 400px;">Data tidak tersedia</div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" lg="4">
        <VCard title="Statistik Layanan Terpopuler">
          <VCardText>
            <Bar 
              v-if="!loading && stats.top_services.length > 0" 
              :options="serviceChartOptions" 
              :data="serviceChartData" 
              style="height: 400px;" 
            />
            <div v-else class="d-flex align-center justify-center" style="height: 400px;">Belum ada data</div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="mt-4">
      <VCol cols="12">
        <VCard title="5 Produk Terlaris Bulan Ini">
          <VTable density="compact" class="text-no-wrap">
            <thead>
              <tr>
                <th class="font-weight-bold">NAMA PRODUK</th>
                <th class="text-right font-weight-bold">TOTAL OMZET</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in stats.top_products" :key="product.name">
                <td>{{ product.name }}</td>
                <td class="text-right font-weight-bold text-success">{{ formatCurrency(product.total_sales) }}</td>
              </tr>
              <tr v-if="stats.top_products.length === 0">
                <td colspan="2" class="text-center pa-4">Belum ada data penjualan</td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="isDetailsModalOpen" max-width="600">
      <VCard>
        <VCardTitle class="bg-primary text-white d-flex align-center pa-4">
          <span class="text-h6">{{ modalTitle }}</span>
          <VSpacer />
          <VBtn icon="tabler-x" variant="text" @click="isDetailsModalOpen = false" />
        </VCardTitle>
        <VCardText class="pa-0">
          <VTable density="compact" hover>
            <thead>
              <tr>
                <th class="text-left font-weight-bold">Nama Produk</th>
                <th class="text-center font-weight-bold">
                  {{ modalTitle.includes('Kadaluwarsa') ? 'Tgl Kadaluwarsa' : 'Sisa Stok' }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in modalData" :key="i">
                <td>{{ item.name }}</td>
                <td class="text-center">
                  <VChip size="small" :color="modalTitle.includes('Habis') ? 'error' : 'warning'" label>
                    {{ item.expiry_date || item.current_stock }}
                  </VChip>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
      </VCard>
    </VDialog>
  </VContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from '@/plugins/axios';
import { Bar } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  Title, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  BarElement, 
  LinearScale 
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, CategoryScale, BarElement, LinearScale)

// --- INTERFACES ---
interface MonthlyReport { month: string; sales: number; purchases: number; }
interface TopService { registration_type: string; total: number; }
interface TopProduct { name: string; total_sales: number; }
interface InventoryItem { name: string; current_stock?: number; expiry_date?: string; }

interface DashboardStats {
  kpi: { total_sales: number; total_purchases: number; payments_in: number; payments_out: number; };
  inventory_alerts: {
    out_of_stock: number;
    low_stock: number;
    near_expired: number;
    details: {
      out_of_stock_list: InventoryItem[];
      low_stock_list: InventoryItem[];
      near_expired_list: InventoryItem[];
    };
  };
  top_services: TopService[];
  top_products: TopProduct[];
  monthly_report: MonthlyReport[];
}

// --- STATE ---
const loading = ref(true);
const stats = ref<DashboardStats>({
  kpi: { total_sales: 0, total_purchases: 0, payments_in: 0, payments_out: 0 },
  inventory_alerts: { 
    out_of_stock: 0, low_stock: 0, near_expired: 0,
    details: { out_of_stock_list: [], low_stock_list: [], near_expired_list: [] }
  },
  top_services: [],
  top_products: [],
  monthly_report: [],
});

const isDetailsModalOpen = ref(false);
const modalTitle = ref('');
const modalData = ref<InventoryItem[]>([]);

// --- METHODS ---
const showDetails = (type: 'out' | 'low' | 'exp') => {
  if (type === 'out') {
    modalTitle.value = 'Daftar Produk Stok Habis';
    modalData.value = stats.value.inventory_alerts.details.out_of_stock_list;
  } else if (type === 'low') {
    modalTitle.value = 'Daftar Produk Stok Menipis';
    modalData.value = stats.value.inventory_alerts.details.low_stock_list;
  } else {
    modalTitle.value = 'Produk Hampir Kadaluwarsa (30 Hari)';
    modalData.value = stats.value.inventory_alerts.details.near_expired_list;
  }
  isDetailsModalOpen.value = true;
};

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    return activeBranchString ? JSON.parse(activeBranchString).id : null;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const fetchDashboardData = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;
  
  loading.value = true;
  try {
    const { data } = await axios.get('/api/dashboard-stats', { params: { branches_id: branchId } });
    if (data?.data) stats.value = data.data;
  } catch (error) {
    console.error('Gagal mengambil data dasbor:', error);
  } finally {
    loading.value = false;
  }
};

// --- CHART DATA ---

// 1. Tren Penjualan vs Pembelian
const trendChartData = computed(() => ({
  labels: stats.value.monthly_report.map(r => r.month),
  datasets: [
    { 
      label: 'Penjualan', 
      backgroundColor: '#28C76F', 
      data: stats.value.monthly_report.map(r => r.sales),
      borderRadius: 4
    },
    { 
      label: 'Pembelian', 
      backgroundColor: '#FFAB00', 
      data: stats.value.monthly_report.map(r => r.purchases),
      borderRadius: 4
    }
  ]
}));

const trendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const } },
  scales: { y: { beginAtZero: true } }
};

// 2. Statistik Layanan Terbaik (Bar Chart Horizontal)
const serviceChartData = computed(() => ({
  labels: stats.value.top_services.map(s => s.registration_type),
  datasets: [{
    label: 'Total Layanan',
    backgroundColor: '#00CFE8',
    data: stats.value.top_services.map(s => s.total),
    borderRadius: 4
  }]
}));

const serviceChartOptions = {
  indexAxis: 'y' as const, // Membuat chart menjadi horizontal
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true } }
};

// --- LIFECYCLE ---
onMounted(() => {
    fetchDashboardData();
    window.addEventListener('branch-changed', fetchDashboardData);
});

onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchDashboardData);
});
</script>

<style scoped>
.match-height > .v-col > .v-card {
  height: 100%;
}
</style>