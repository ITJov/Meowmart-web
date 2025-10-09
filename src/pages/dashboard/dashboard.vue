<template>
  <VContainer fluid>
    <!-- Baris KPI Cards -->
    <VRow class="match-height">
      <VCol cols="12" md="3" sm="6">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <span class="text-h6">Total Penjualan</span>
            <VAvatar color="success" variant="tonal" rounded size="42">
              <VIcon icon="tabler-currency-dollar" />
            </VAvatar>
          </VCardTitle>
          <VCardText>
            <h4 class="text-h4 mb-1">{{ formatCurrency(stats.kpi.total_sales) }}</h4>
            <span class="text-caption text-medium-emphasis">Penjualan Bulan Ini</span>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="3" sm="6">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <span class="text-h6">Total Pengeluaran</span>
            <VAvatar color="warning" variant="tonal" rounded size="42">
              <VIcon icon="tabler-wallet" />
            </VAvatar>
          </VCardTitle>
          <VCardText>
            <h4 class="text-h4 mb-1">{{ formatCurrency(stats.kpi.total_purchases) }}</h4>
            <span class="text-caption text-medium-emphasis">Pembelian Bulan Ini</span>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="3" sm="6">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <span class="text-h6">Pembayaran Keluar</span>
            <VAvatar color="error" variant="tonal" rounded size="42">
              <VIcon icon="tabler-credit-card" />
            </VAvatar>
          </VCardTitle>
          <VCardText>
            <h4 class="text-h4 mb-1">{{ formatCurrency(stats.kpi.payments_out) }}</h4>
            <span class="text-caption text-medium-emphasis">Total Pembayaran ke Supplier</span>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="3" sm="6">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <span class="text-h6">Pembayaran Masuk</span>
            <VAvatar color="info" variant="tonal" rounded size="42">
              <VIcon icon="tabler-cash" />
            </VAvatar>
          </VCardTitle>
          <VCardText>
            <h4 class="text-h4 mb-1">{{ formatCurrency(stats.kpi.payments_in) }}</h4>
            <span class="text-caption text-medium-emphasis">Total Pembayaran dari Pelanggan</span>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Baris Grafik & List -->
    <VRow class="match-height mt-4">
      <VCol cols="12" lg="6">
        <VCard>
          <VCardTitle>Penjualan & Pembelian</VCardTitle>
          <VCardText>
            <!-- DIUBAH: Ganti placeholder dengan komponen grafik bar -->
            <Bar
              v-if="!loading && stats.monthly_report.length > 0"
              :options="barChartOptions"
              :data="barChartData"
              style="height: 300px;"
            />
             <div v-if="!loading && stats.monthly_report.length === 0" class="d-flex align-center justify-center" style="height: 300px;">
              <span class="text-medium-emphasis">Data laporan bulanan tidak tersedia.</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" lg="3">
        <VCard>
          <VCardTitle>Penjualan Layanan Terbaik</VCardTitle>
          <VCardText>
            <Doughnut
              v-if="!loading && stats.top_services.length > 0"
              :options="donutChartOptions"
              :data="donutChartData"
              style="height: 300px;"
            />
            <div v-if="!loading && stats.top_services.length === 0" class="d-flex align-center justify-center" style="height: 300px;">
              <span class="text-medium-emphasis">Belum ada data layanan.</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" lg="3">
        <VCard>
          <VCardTitle>Penjualan Produk Terbaik</VCardTitle>
          <VList lines="one" density="compact">
            <VListItem
              v-for="product in stats.top_products"
              :key="product.name"
              :title="product.name"
              :subtitle="formatCurrency(product.total_sales)"
              class="border-b"
            />
             <VListItem v-if="!loading && stats.top_products.length === 0">
              <VListItemTitle>Belum ada penjualan produk.</VListItemTitle>
            </VListItem>
          </VList>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from '@/plugins/axios';
// DIUBAH: Import Bar chart dan elemen-elemen yang dibutuhkan
import { Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale, BarElement, LinearScale } from 'chart.js'

// DIUBAH: Daftarkan elemen baru untuk Bar Chart
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, BarElement, LinearScale)

// DITAMBAHKAN: Interface untuk mendefinisikan "bentuk" data (solusi error TypeScript)
interface MonthlyReport {
  month: string;
  sales: number;
  purchases: number;
}
interface TopService {
  registration_type: string;
  total: number;
}
interface TopProduct {
  name: string;
  total_sales: number;
}
interface DashboardStats {
  kpi: {
    total_sales: number;
    total_purchases: number;
    payments_in: number;
    payments_out: number;
  };
  top_services: TopService[];
  top_products: TopProduct[];
  monthly_report: MonthlyReport[]; // <-- Tambahkan tipe baru
}

// DIUBAH: State diberi tipe yang benar dan inisialisasi baru
const stats = ref<DashboardStats>({
  kpi: { total_sales: 0, total_purchases: 0, payments_in: 0, payments_out: 0 },
  top_services: [],
  top_products: [],
  monthly_report: [],
});
const loading = ref(true);

// Opsi Grafik Donut (Tidak Berubah)
const donutChartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
});
const donutChartData = computed(() => ({
  labels: stats.value.top_services.map(s => s.registration_type),
  datasets: [
    {
      backgroundColor: ['#28C76F', '#00CFE8', '#826AF9', '#FFAB00'],
      data: stats.value.top_services.map(s => s.total)
    }
  ]
}));

// DITAMBAHKAN: Opsi dan data untuk grafik bar
const barChartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
});
const barChartData = computed(() => ({
  labels: stats.value.monthly_report.map(r => r.month),
  datasets: [
    {
      label: 'Penjualan',
      backgroundColor: '#28C76F', // Warna Hijau
      data: stats.value.monthly_report.map(r => r.sales)
    },
    {
      label: 'Pembelian',
      backgroundColor: '#FFAB00', // Warna Oranye
      data: stats.value.monthly_report.map(r => r.purchases)
    }
  ]
}));


const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const fetchDashboardData = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    console.error("Cabang aktif tidak ditemukan.");
    return;
  }
  loading.value = true;
  try {
    const { data } = await axios.get('/api/dashboard-stats', {
      params: { branches_id: branchId },
    });
    if (data && data.data) {
      stats.value = data.data;
    }
  } catch (error) {
    console.error('Gagal mengambil data dasbor:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
    fetchDashboardData();
    window.addEventListener('branch-changed', fetchDashboardData);
});

onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchDashboardData);
});
</script>

