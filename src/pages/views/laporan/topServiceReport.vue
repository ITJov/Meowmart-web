<template>
  <VCard>
    <VCardTitle class="pa-4">
      <span class="text-h5">Laporan Layanan Paling Laku</span>
    </VCardTitle>

    <VCardText>
      <VRow>
        <VCol cols="12" md="4">
          <VSelect
            v-model="filters.branches_id"
            :items="branches"
            item-title="name"
            item-value="id"
            label="Pilih Cabang"
            density="compact"
            variant="outlined"
            hide-details
          />
        </VCol>

        <VCol cols="12" md="3">
          <VTextField
            v-model="filters.start_date"
            type="date"
            label="Tanggal Mulai"
            density="compact"
            variant="outlined"
            hide-details
          />
        </VCol>

        <VCol cols="12" md="3">
          <VTextField
            v-model="filters.end_date"
            type="date"
            label="Tanggal Selesai"
            density="compact"
            variant="outlined"
            hide-details
          />
        </VCol>

        <VCol cols="12" md="2" class="d-flex align-center">
          <VBtn color="primary" block @click="fetchTopServices" :loading="loading">
            TERAPKAN FILTER
          </VBtn>
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

    <VTable class="text-no-wrap">
      <thead>
        <tr>
          <th class="text-left font-weight-bold">PERINGKAT</th>
          <th class="text-left font-weight-bold">NAMA LAYANAN</th>
          <th class="text-center font-weight-bold">JUMLAH TRANSAKSI</th>
          <th class="text-right font-weight-bold">TOTAL PENDAPATAN</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="topServices.length === 0 && !loading">
          <td colspan="4" class="text-center pa-4 text-grey">
            Tidak ada data layanan ditemukan untuk filter ini.
          </td>
        </tr>
        <tr v-for="(service, index) in topServices" :key="index">
          <td>
            <VAvatar size="28" :color="index < 3 ? 'amber' : 'grey-lighten-2'" class="text-white text-caption">
              {{ index + 1 }}
            </VAvatar>
          </td>
          <td class="font-weight-medium">{{ service.service_name }}</td>
          <td class="text-center">{{ service.total_usage }} Kali</td>
          <td class="text-right text-success font-weight-bold">
            {{ formatCurrency(service.total_revenue) }}
          </td>
        </tr>
      </tbody>
    </VTable>
  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/plugins/axios';

interface TopService {
  service_name: string;
  total_usage: number;
  total_revenue: number;
}

const loading = ref(false);
const topServices = ref<TopService[]>([]);
const branches = ref<any[]>([]);
const totalItems = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

// Filter Default (Cabang aktif & rentang tanggal hari ini)
const filters = ref({
  branches_id: null as number | null,
  start_date: new Date().toISOString().substr(0, 10),
  end_date: new Date().toISOString().substr(0, 10),
});

const fetchBranches = async () => {
  try {
    const { data } = await axios.get('/api/branches', { params: { all: true } });
    
    // PERBAIKAN: Sesuaikan dengan struktur respons Laravel (biasanya data.data atau data)
    branches.value = data.data?.data || data.data || data;

    // Tambahkan opsi "Semua Cabang" secara manual agar filter lebih fleksibel
    if (Array.isArray(branches.value)) {
      branches.value.unshift({ id: 0, name: 'Semua Cabang' });
    }

    // Set default cabang dari localStorage
    const activeBranch = localStorage.getItem('activeBranch');
    if (activeBranch) {
      filters.value.branches_id = JSON.parse(activeBranch).id;
    } else if (branches.value.length > 0) {
      filters.value.branches_id = branches.value[0].id;
    }
  } catch (error) {
    console.error('Gagal mengambil daftar cabang:', error);
  }
};

const fetchTopServices = async () => {
  if (filters.value.branches_id === null || filters.value.branches_id === undefined) return;
  
  loading.value = true;
  try {
    const { data } = await axios.get('/api/reports/top-services', {
      params: {
        start_date: filters.value.start_date,
        end_date: filters.value.end_date,
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        branches_id: filters.value.branches_id === 0 ? null : filters.value.branches_id,
      },
    });

    if (data.success) {
      // Sesuai referensi Anda: data.data.data adalah isi array-nya
      topServices.value = data.data.data;
      // Ambil total item untuk keperluan UI paginasi jika ada
      totalItems.value = data.data.total; 
    }
  } catch (error: any) {
    console.error('Detail Error:', error.response?.data);
    alert(`Kesalahan: ${error.response?.data?.message || 'Gagal memuat data'}`);
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(val);
};

onMounted(async () => {
  await fetchBranches();
  fetchTopServices();
});
</script>