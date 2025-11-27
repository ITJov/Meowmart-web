<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Laporan Untung & Rugi</span>
      <VSpacer />
      <VBtn color="orange" @click="downloadReport" :disabled="!reportData">
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
        <!-- Tombol Terapkan -->
        <VCol cols="12" md="2">
          <VBtn 
            @click="fetchReport" 
            :disabled="!isFilterValid || loading" 
            :loading="loading"
            block 
            color="primary"
          >
            Terapkan
          </VBtn>
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

    <!-- === HASIL LAPORAN === -->
    <VCardText v-if="loading">
      <VProgressLinear indeterminate color="primary" />
      <p class="text-center mt-2">Memuat data laporan...</p>
    </VCardText>

    <VCardText v-else-if="!reportData && !loading">
      <VAlert type="info" variant="tonal">
        Silakan pilih cabang dan rentang tanggal, lalu tekan "Terapkan" untuk melihat laporan.
      </VAlert>
    </VCardText>

    <VCardText v-else-if="reportData" class="pa-6">
      <p class="text-center text-medium-emphasis mb-4">
        Menampilkan laporan untuk periode 
        <span class="font-weight-bold">{{ reportData.start_date }}</span> 
        s/d 
        <span class="font-weight-bold">{{ reportData.end_date }}</span>
      </p>

      <VRow>
        <!-- Kolom Laba Rugi -->
        <VCol cols="12" md="6">
          <VCard variant="outlined">
            <VCardItem>
              <VCardTitle>Ringkasan Laba Rugi</VCardTitle>
            </VCardItem>
            <VDivider />
            <VList density="compact">
              <VListItem title="Pendapatan (Revenue)">
                <template #append>
                  <span class="text-success font-weight-medium">{{ formatCurrency(reportData.total_revenue) }}</span>
                </template>
              </VListItem>
              <VListItem title="Harga Pokok Penjualan (COGS)">
                <template #append>
                  <span class="text-error font-weight-medium">({{ formatCurrency(reportData.total_cogs) }})</span>
                </template>
              </VListItem>
              <VDivider class="my-2" />
              <VListItem class="bg-grey-lighten-4">
                <VListItemTitle class="font-weight-bold">Laba Kotor (Gross Profit)</VListItemTitle>
                <template #append>
                  <span class="font-weight-bold">{{ formatCurrency(reportData.gross_profit) }}</span>
                </template>
              </VListItem>
              <VDivider class="my-2" />
              <VListItem title="Beban Operasional Lainnya">
                <template #append>
                  <span class="text-error font-weight-medium">({{ formatCurrency(reportData.total_expenses) }})</span>
                </template>
              </VListItem>
              <VDivider class="my-2" />
              <VListItem class="bg-blue-lighten-5">
                <VListItemTitle class="font-weight-bold text-h6">Laba Bersih (Net Profit)</VListItemTitle>
                <template #append>
                  <span 
                    :class="reportData.net_profit >= 0 ? 'text-success' : 'text-error'" 
                    class="font-weight-bold text-h6"
                  >
                    {{ formatCurrency(reportData.net_profit) }}
                  </span>
                </template>
              </VListItem>
            </VList>
          </VCard>
        </VCol>

        <!-- Kolom Arus Kas -->
        <VCol cols="12" md="6">
          <VCard variant="outlined">
            <VCardItem>
              <VCardTitle>Ringkasan Arus Kas</VCardTitle>
            </VCardItem>
            <VDivider />
            <VList density="compact">
              <VListItem title="Total Uang Masuk (Cash In)">
                <template #append>
                  <span class="text-success font-weight-medium">{{ formatCurrency(reportData.total_cash_in) }}</span>
                </template>
              </VListItem>
              <VListItem title="Total Uang Keluar (Cash Out)">
                <template #append>
                  <span class="text-error font-weight-medium">({{ formatCurrency(reportData.total_cash_out) }})</span>
                </template>
              </VListItem>
              <VDivider class="my-2" />
              <VListItem class="bg-grey-lighten-4">
                <VListItemTitle class="font-weight-bold">Arus Kas Bersih (Net Cash Flow)</VListItemTitle>
                <template #append>
                  <span 
                    :class="reportData.net_cash_flow >= 0 ? 'text-success' : 'text-error'"
                    class="font-weight-bold"
                  >
                    {{ formatCurrency(reportData.net_cash_flow) }}
                  </span>
                </template>
              </VListItem>
            </VList>
          </VCard>
        </VCol>
      </VRow>
    </VCardText>

  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from '@/plugins/axios'; // Pastikan path axios Anda benar

// --- State ---
const loading = ref(false);
const reportData = ref<any | null>(null);
const branchList = ref<any[]>([]);
const filters = ref({
  start_date: '',
  end_date: '',
  branches_id: null as number | null, // Tentukan tipe agar lebih jelas
});

// --- Computed ---
// Cek apakah filter sudah siap untuk kirim API
const isFilterValid = computed(() => {
  return filters.value.start_date && filters.value.end_date && filters.value.branches_id;
});

// --- Helper Functions ---

// Mengatur tanggal default (awal bulan ini dan hari ini)
const setDefaultDates = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Format YYYY-MM-DD
  filters.value.start_date = firstDayOfMonth.toISOString().split('T')[0];
  filters.value.end_date = today.toISOString().split('T')[0];
};

// Format mata uang IDR
const formatCurrency = (value: number) => {
  if (value === null || value === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// --- API Calls ---

// 1. Ambil daftar cabang untuk filter
const fetchBranches = async () => {
  try {
    // Asumsi Anda punya endpoint untuk ambil semua cabang
    const { data } = await axios.get('/api/branches', { 
      params: { all: true } // Asumsi API-nya mendukung 'all'
    });
    // Sesuaikan 'data.data' jika format API Anda berbeda
    branchList.value = data.data.data || data.data; 
  } catch (error) {
    console.error('Gagal mengambil daftar cabang:', error);
    alert('Gagal memuat daftar cabang. Halaman mungkin tidak berfungsi.');
  }
};

// 2. Ambil data laporan utama
const fetchReport = async () => {
  if (!isFilterValid.value) {
    alert('Silakan pilih cabang, tanggal mulai, dan tanggal selesai.');
    return;
  }
  
  loading.value = true;
  reportData.value = null; // Kosongkan data lama
  
  try {
    const { data } = await axios.get('/api/reports/profit-loss', {
      params: filters.value, // Kirim filter ke backend
    });

    if (data.success && data.data) {
      reportData.value = data.data;
    }
  } catch (error: any) {
    console.error('Gagal mengambil data laporan:', error);
    alert(`Terjadi kesalahan: ${error.response?.data?.message || error.message}`);
  } finally {
    loading.value = false;
  }
};

// Fungsi untuk tombol download (placeholder)
const downloadReport = async () => {
  if (!reportData.value) {
    alert('Silakan buat laporan terlebih dahulu sebelum mengunduh.');
    return;
  }

  loading.value = true; // Mengaktifkan loading
  try {
    // Panggil endpoint baru untuk download
    const response = await axios.get('/api/reports/profit-loss/download', {
      params: filters.value, // Kirim filter yang sama
      responseType: 'blob', // PENTING: Minta respons sebagai blob (file)
    });

    // Ambil nama file dari header Content-Disposition
    const contentDisposition = response.headers['content-disposition'];
    let filename = `Laporan_Untung_Rugi_${filters.value.start_date}_sd_${filters.value.end_date}.xlsx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch.length > 1) {
        filename = filenameMatch[1];
      }
    }

    // Buat link sementara dan klik untuk memulai download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename); // Atur nama file
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url); // Bersihkan URL object

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
  setDefaultDates();
  fetchBranches();
  
  // Cek apakah cabang aktif ada di localStorage (sesuai kode Anda sebelumnya)
  const activeBranchString = localStorage.getItem('activeBranch');
  if (activeBranchString) {
    try {
      const activeBranch = JSON.parse(activeBranchString);
      if (activeBranch && activeBranch.id) {
        filters.value.branches_id = activeBranch.id;
        // Otomatis muat laporan untuk cabang aktif jika tanggal sudah ada
        fetchReport();
      }
    } catch(e) {
      console.error("Gagal parse activeBranch dari localStorage", e);
    }
  }
});

</script>

<style scoped>
.v-list-item-title {
  font-size: 0.95rem;
}
</style>

