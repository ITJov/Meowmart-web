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

    <VCardText>
      <VRow>
        <VCol cols="12" md="4">
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

    <VCardText v-if="loading">
      <VProgressLinear indeterminate color="primary" />
      <p class="text-center mt-2">Memuat data laporan...</p>
    </VCardText>

    <VCardText v-else-if="!reportData && !loading">
      <VAlert type="info" variant="tonal">
        Silakan pilih rentang tanggal (dan opsional Cabang), lalu tekan "Terapkan" untuk melihat laporan.
      </VAlert>
    </VCardText>

    <VCardText v-else-if="reportData" class="pa-6">
      <p class="text-center text-medium-emphasis mb-4">
        Menampilkan laporan untuk periode 
        <span class="font-weight-bold">{{ reportData.start_date }}</span> 
        s/d 
        <span class="font-weight-bold">{{ reportData.end_date }}</span>
        <span v-if="reportData.report_for_all_branches" class="font-weight-bold text-primary"> (Semua Cabang)</span>
      </p>

      <VRow v-if="reportData.report_for_all_branches && reportData.branch_details.length > 0" class="mt-6">
        <VCol cols="12">
          <VCard variant="tonal" color="info">
            <VCardItem>
              <VCardTitle>Detail Kontribusi Laba Bersih Per Cabang</VCardTitle>
            </VCardItem>
            <VDivider />
            <VTable density="compact">
              <thead>
                <tr>
                  <th class="text-left">Cabang</th>
                  <th class="text-right">Pendapatan</th>
                  <th class="text-right">HPP</th>
                  <th class="text-right">Beban Lainnya</th>
                  <th class="text-right">Laba Bersih</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in reportData.branch_details" :key="item.id">
                  <td>{{ item.name }}</td>
                  <td class="text-right text-success">{{ formatCurrency(item.revenue) }}</td>
                  <td class="text-right text-error">({{ formatCurrency(item.cogs) }})</td>
                  <td class="text-right text-error">({{ formatCurrency(item.expenses) }})</td>
                  <td class="text-right font-weight-bold" :class="item.net_profit >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(item.net_profit) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td class="font-weight-bold">Total Global</td>
                  <td class="text-right font-weight-bold text-success">{{ formatCurrency(reportData.total_revenue) }}</td>
                  <td class="text-right font-weight-bold text-error">({{ formatCurrency(reportData.total_cogs) }})</td>
                  <td class="text-right font-weight-bold text-error">({{ formatCurrency(reportData.total_expenses) }})</td>
                  <td class="text-right font-weight-bold text-h6" :class="reportData.net_profit >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(reportData.net_profit) }}
                  </td>
                </tr>
              </tfoot>
            </VTable>
          </VCard>
        </VCol>
      </VRow>

      <VRow>
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
import axios from '@/plugins/axios'; 

// --- State ---
const loading = ref(false);
const reportData = ref<any | null>(null);
const branchList = ref<any[]>([]);
const filters = ref({
  start_date: '',
  end_date: '',
  branches_id: 0 as number | null, 
});

// --- Computed ---

// Tambahkan opsi "Semua Cabang" ke daftar
const branchListWithAll = computed(() => {
  return [
    { id: 0, name: 'Semua Cabang' },
    ...branchList.value,
  ];
});

// Cek apakah filter sudah siap (Hanya tanggal yang wajib)
const isFilterValid = computed(() => {
  return filters.value.start_date && filters.value.end_date;
});

// --- Helper Functions ---

const setDefaultDates = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Format YYYY-MM-DD
  filters.value.start_date = firstDayOfMonth.toISOString().split('T')[0];
  filters.value.end_date = today.toISOString().split('T')[0];
};

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

const fetchBranches = async () => {
  try {
    const { data } = await axios.get('/api/branches', { 
      params: { all: true }
    });
    branchList.value = data.data.data || data.data; 
    
    if (filters.value.branches_id === null) {
        filters.value.branches_id = 0;
    }
    
  } catch (error) {
    console.error('Gagal mengambil daftar cabang:', error);
  }
};

const fetchReport = async () => {
  if (!isFilterValid.value) {
    alert('Silakan pilih tanggal mulai dan tanggal selesai.');
    return;
  }
  
  loading.value = true;
  reportData.value = null; 
  
  const paramsToSend = {
    ...filters.value,
    branches_id: filters.value.branches_id || 0, // Kirim 0 jika null
  };
  
  try {
    const { data } = await axios.get('/api/reports/profit-loss', {
      params: paramsToSend,
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

const downloadReport = async () => {
  if (!reportData.value) {
    alert('Silakan buat laporan terlebih dahulu sebelum mengunduh.');
    return;
  }

  loading.value = true; 
  try {
    const paramsToSend = {
        ...filters.value,
        branches_id: filters.value.branches_id || 0,
    };
    
    const response = await axios.get('/api/reports/profit-loss/download', {
      params: paramsToSend,
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = `Laporan_Untung_Rugi_${paramsToSend.start_date}_sd_${paramsToSend.end_date}.xlsx`;
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
  setDefaultDates();
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

  filters.value.branches_id = branchIdFromLocalStorage || 0;
  fetchReport();
});

</script>

<style scoped>
.v-list-item-title {
  font-size: 0.95rem;
}
</style>