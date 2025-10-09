<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Registrasi</span>
      <VSpacer />
      <!-- DITAMBAHKAN: Tombol "Bayar Sekaligus" yang hanya muncul di tab Pembayaran -->
      <VBtn
        v-if="activeTab === 'Pembayaran'"
        color="success"
        class="me-2"
        @click="payMultiple"
        :disabled="selectedItems.length === 0"
      >
        <VIcon icon="mdi-cash-multiple" start />
        Bayar Sekaligus
      </VBtn>
      <VBtn color="primary" @click="goToCreatePage">
        <VIcon icon="mdi-plus" start />
        Tambah Data
      </VBtn>
    </VCardTitle>

    <VCardText>
        <VRow>
            <VCol cols="12" md="4">
                 <VTextField
                    v-model="search"
                    density="compact"
                    label="Cari Berdasarkan ID Booking"
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    hide-details
                />
            </VCol>
        </VRow>
    </VCardText>

    <VTabs v-model="activeTab" class="px-4">
      <VTab
        v-for="tab in tabItems"
        :key="tab.value"
        :value="tab.value"
      >
        {{ tab.title }} ({{ tab.count }})
      </VTab>
    </VTabs>
    <VDivider />

    <VDataTableServer
      v-model="selectedItems"
      show-select
      :headers="headers"
      :items="registrations"
      :items-length="totalRegistrations"
      :loading="loading"
      @update:options="fetchRegistrations"
      item-value="id"
    >
      <template #[`item.customer`]="{ item }">
        {{ item.customer?.name || '-' }}
      </template>
      <template #[`item.created_at`]="{ item }">
        {{ new Date(item.created_at).toLocaleDateString('id-ID') }}
      </template>
      <template #[`item.status`]="{ item }">
        <VChip :color="getStatusColor(item.status)" size="small">{{ item.status }}</VChip>
      </template>
      <template #[`item.actions`]="{ item }">
        <VMenu location="bottom end">
          <template #activator="{ props }">
            <VBtn icon="mdi-dots-vertical" v-bind="props" variant="text" />
          </template>
          <VList density="compact">
            <VListItem link>
              <VListItemTitle>
                <VIcon icon="mdi-pencil" start /> Edit
              </VListItemTitle>
            </VListItem>
            
            <VListItem v-if="item.status === 'Terjadwal'" link @click="updateStatus(item, 'Menunggu Antrian')">
              <VListItemTitle>
                <VIcon icon="mdi-account-clock" start /> Pindahkan ke Antrian
              </VListItemTitle>
            </VListItem>

            <VListItem v-if="item.status === 'Menunggu Antrian'" link @click="updateStatus(item, 'Dalam Tindakan')">
              <VListItemTitle>
                <VIcon icon="mdi-play-circle" start /> Mulai Tindakan
              </VListItemTitle>
            </VListItem>
            
            <!-- DIUBAH: Aksi untuk mengirim ke pembayaran -->
            <VListItem v-if="item.status === 'Dalam Tindakan'" link @click="updateStatus(item, 'Pembayaran')">
              <VListItemTitle>
                <VIcon icon="mdi-cash-register" start /> Kirim ke Pembayaran
              </VListItemTitle>
            </VListItem>
            
            <!-- DITAMBAHKAN: Aksi khusus di tab Pembayaran -->
            <VListItem v-if="item.status === 'Pembayaran'" link @click="goToPayment(item)">
              <VListItemTitle class="text-success">
                <VIcon icon="mdi-cart-arrow-right" start /> Bayar
              </VListItemTitle>
            </VListItem>

            <VListItem v-if="item.status === 'Pembayaran'" link @click="updateStatus(item, 'Selesai')">
              <VListItemTitle>
                <VIcon icon="mdi-check-circle" start /> Tandai Selesai (Tanpa POS)
              </VListItemTitle>
            </VListItem>
          </VList>
        </VMenu>
      </template>
    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';

interface Registration {
  id: number;
  booking_id: string;
  registration_type: string;
  created_at: string;
  status: string;
  customer: { name: string; } | null;
}

const router = useRouter();
const loading = ref(true);
const search = ref('');
const activeTab = ref('Terjadwal');
const registrations = ref<Registration[]>([]);
const totalRegistrations = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });
const selectedItems = ref<number[]>([]); // Untuk menampung ID item yang dipilih

// DIUBAH: Tambahkan status "Pembayaran" dan sesuaikan urutan
const tabItems = ref([
    { title: 'Terjadwal', value: 'Terjadwal', count: 0 },
    { title: 'Menunggu Antrian', value: 'Menunggu Antrian', count: 0 },
    { title: 'Dalam Tindakan', value: 'Dalam Tindakan', count: 0 },
    { title: 'Pembayaran', value: 'Pembayaran', count: 0 },
    { title: 'Selesai', value: 'Selesai', count: 0 },
    { title: 'Batal', value: 'Batal', count: 0 },
]);

const headers = [
  { title: 'CATEGORY', key: 'registration_type' },
  { title: 'NO REG', key: 'booking_id' },
  { title: 'DATE REG', key: 'created_at' },
  { title: 'CUSTOMER', key: 'customer' },
  { title: 'STATUS', key: 'status' },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const;

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const fetchRegistrations = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;

  loading.value = true;
  selectedItems.value = []; // Reset pilihan setiap kali data di-load
  try {
    const { data } = await axios.get('/api/registrations', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        status: activeTab.value,
        branches_id: branchId,
      },
    });
    registrations.value = data.data.data;
    totalRegistrations.value = data.data.total;
  } catch (error) {
    console.error('Gagal mengambil data registrasi:', error);
  } finally {
    loading.value = false;
  }
};

const fetchRegistrationCounts = async () => {
    const branchId = getActiveBranchId();
    if (!branchId) return;
    try {
        const { data } = await axios.get('/api/registrations/counts', {
            params: { branches_id: branchId }
        });
        tabItems.value.forEach(tab => {
            tab.count = data.data[tab.value] || 0;
        });
    } catch (error) {
        console.error('Gagal mengambil jumlah registrasi:', error);
    }
};

const loadBranchData = () => {
    fetchRegistrations();
    fetchRegistrationCounts();
}

const updateStatus = async (item: Registration, newStatus: string) => {
    if (!confirm(`Apakah Anda yakin ingin mengubah status menjadi "${newStatus}"?`)) return;

    loading.value = true;
    try {
        await axios.patch(`/api/registrations/${item.id}/status`, { status: newStatus });
        loadBranchData();
    } catch (error) {
        console.error('Gagal mengubah status:', error);
        alert('Terjadi kesalahan saat mengubah status.');
        loading.value = false;
    }
}

// DITAMBAHKAN: Fungsi untuk redirect ke halaman POS
const goToPayment = (item: Registration) => {
    const registrationIds = [item.id];
    const encodedIds = JSON.stringify(registrationIds);
    router.push({ name: 'products-management', query: { registrations: encodedIds } });
}

// DITAMBAHKAN: Fungsi untuk bayar beberapa item sekaligus
const payMultiple = () => {
    if (selectedItems.value.length === 0) {
        alert('Silakan pilih minimal satu item untuk dibayar.');
        return;
    }
    const encodedIds = JSON.stringify(selectedItems.value);
    router.push({ name: 'products-management', query: { registrations: encodedIds } });
}

// DITAMBAHKAN: Warna untuk status Pembayaran
const getStatusColor = (status: string) => {
    if (status === 'Terjadwal') return 'blue';
    if (status === 'Menunggu Antrian') return 'orange';
    if (status === 'Dalam Tindakan') return 'purple';
    if (status === 'Pembayaran') return 'info'; // Warna baru
    if (status === 'Batal') return 'error';
    return 'success'; 
}

const goToCreatePage = () => {
    router.push({ name: 'add-registrations' });
}

watch([search, activeTab], () => {
    options.value.page = 1;
    fetchRegistrations();
});

onMounted(() => {
    loadBranchData();
    window.addEventListener('branch-changed', loadBranchData);
});

onUnmounted(() => {
    window.removeEventListener('branch-changed', loadBranchData);
});
</script>

