<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Transfer Stok</span>
      <VSpacer />
      <VTextField
        v-model="search"
        density="compact"
        label="Cari No. Referensi"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        hide-details
        clearable
        style="max-width: 300px;"
        class="me-2"
      />
      <VBtn color="primary" @click="goToCreatePage">
        <VIcon icon="mdi-plus" start />
        Buat Transfer Stok
      </VBtn>
    </VCardTitle>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="transferList"
      :items-length="totalItems"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchTransfers"
    >
      <!-- Tampilkan nama gudang dari relasi -->
      <template #[`item.from_warehouse`]="{ item }">
        {{ item.from_warehouse?.name || '-' }}
      </template>
      <template #[`item.to_warehouse`]="{ item }">
        {{ item.to_warehouse?.name || '-' }}
      </template>
      
      <!-- Format tanggal -->
      <template #[`item.transfer_date`]="{ item }">
        {{ formatDate(item.transfer_date) }}
      </template>

      <!-- Chip status -->
      <template #[`item.status`]="{ item }">
        <VChip :color="getStatusColor(item.status)" size="small">{{ item.status }}</VChip>
      </template>

      <!-- Aksi -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1 justify-end">
          <!-- PERBAIKAN: Panggil fungsi viewDetails -->
          <VBtn icon="mdi-eye" size="small" variant="text" title="Lihat Detail" @click="viewDetails(item)" />
        </div>
      </template>

      <!-- Pesan jika tidak ada data -->
      <template #no-data>
        <div class="text-center py-4">Tidak ada data transfer stok.</div>
      </template>

    </VDataTableServer>
  </VCard>

  <!-- === TAMBAHAN: MODAL/DIALOG UNTUK DETAIL TRANSFER === -->
  <VDialog v-model="isDetailModalVisible" max-width="700px">
    <VCard v-if="selectedTransfer">
      <VCardTitle class="d-flex align-center pa-4">
        <span class="text-h5">Detail Transfer</span>
        <VChip color="grey-darken-1" size="small" class="ms-3">{{ selectedTransfer.reference_number }}</VChip>
      </VCardTitle>
      <VDivider />

      <VCardText>
        <VRow dense>
          <VCol cols="12" md="6">
            <div class="text-caption text-medium-emphasis">Dari Gudang</div>
            <div class="font-weight-medium">{{ selectedTransfer.from_warehouse?.name }}</div>
          </VCol>
          <VCol cols="12" md="6">
            <div class="text-caption text-medium-emphasis">Ke Gudang</div>
            <div class="font-weight-medium">{{ selectedTransfer.to_warehouse?.name }}</div>
          </VCol>
          <VCol cols="12" md="6">
            <div class="text-caption text-medium-emphasis">Tanggal</div>
            <div class="font-weight-medium">{{ formatDate(selectedTransfer.transfer_date) }}</div>
          </VCol>
          <VCol cols="12" md="6">
            <div class="text-caption text-medium-emphasis">Status</div>
            <div>
              <VChip :color="getStatusColor(selectedTransfer.status)" size="small">{{ selectedTransfer.status }}</VChip>
            </div>
          </VCol>
        </VRow>

        <h4 class="text-h6 mt-6 mb-2">Produk yang Ditransfer</h4>
        <VDivider class="mb-2" />
        
        <VList v-if="selectedTransfer.items && selectedTransfer.items.length > 0" lines="one" class="border rounded">
          <VListItem
            v-for="item in selectedTransfer.items"
            :key="item.id"
            :title="item.product?.name || 'Produk tidak ditemukan'"
          >
            <template #append>
              <span class="font-weight-medium">Jumlah: {{ item.quantity }} {{ item.product?.unit?.name || '' }}</span>
            </template>
          </VListItem>
        </VList>
        <div v-else class="text-center text-medium-emphasis pa-4">
          Tidak ada item produk pada transfer ini.
        </div>

      </VCardText>

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn color="primary" variant="tonal" @click="isDetailModalVisible = false">
          Tutup
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
  <!-- === SELESAI MODAL === -->

</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import axios from '../../../plugins/axios'
import { useRouter } from 'vue-router';

const router = useRouter();

// --- State ---
const transferList = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalItems = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

// --- TAMBAHAN: State untuk Modal ---
const isDetailModalVisible = ref(false);
const selectedTransfer = ref<any | null>(null);
// --- Selesai Tambahan ---

// --- Headers Tabel ---
const headers = [
  { title: 'NO. REFERENSI', key: 'reference_number' },
  { title: 'DARI GUDANG', key: 'from_warehouse', sortable: false },
  { title: 'KE GUDANG', key: 'to_warehouse', sortable: false },
  { title: 'TANGGAL', key: 'transfer_date' },
  { title: 'STATUS', key: 'status' },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const;

// --- API Call ---
const fetchTransfers = async () => {
  loading.value = true;
  try {
    const { data } = await axios.get('/api/transfer-stock', { // Pastikan URL API benar
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
      },
    });
    if (data && data.data) {
      transferList.value = data.data.data;
      totalItems.value = data.data.total;
    }
  } catch (error) {
    console.error('Gagal mengambil data transfer stok:', error);
  } finally {
    loading.value = false;
  }
};

// --- Helper Functions ---
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const getStatusColor = (status: string) => {
  if (status?.toLowerCase() === 'completed') return 'success';
  if (status?.toLowerCase() === 'pending') return 'warning';
  return 'default';
};

// --- Navigasi ---
const goToCreatePage = () => {
  router.push({ name: 'create-transfer-stock' }); 
};

// --- PERBAIKAN: Fungsi untuk membuka modal ---
const viewDetails = (item: any) => {
  selectedTransfer.value = item; // Simpan data item yang diklik
  isDetailModalVisible.value = true; // Buka modal
};
// --- Selesai Perbaikan ---

// --- Lifecycle & Watchers ---
onMounted(() => {
  fetchTransfers();
});

let searchTimeout: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
     options.value.page = 1; 
     fetchTransfers();
  }, 500); 
});
</script>

