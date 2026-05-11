<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Registrasi</span>
      <VSpacer />
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

    <VTabs v-model="activeTab" class="px-4" color="primary">
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
      v-model:options="options"
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

            <VListItem v-if="item.status === 'Terjadwal'" link @click="goToPayment(item)">
              <VListItemTitle class="text-success font-weight-bold">
                <VIcon icon="mdi-cart-arrow-right" start /> SUDAH DIKERJAKAN
              </VListItemTitle>
            </VListItem>

            <VListItem
              v-if="item.status !== 'Selesai' && item.status !== 'Batal'"
              link
              @click="updateStatus(item, 'Batal')"
            >
              <VListItemTitle class="text-error">
                <VIcon icon="mdi-cancel" start />
                Batalkan Layanan
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
  service?: {
    id: number;
    name: string;
    price: number;
  };
}

const router = useRouter();
const loading = ref(true);
const search = ref('');
const activeTab = ref('Terjadwal');
const registrations = ref<Registration[]>([]);
const totalRegistrations = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });
const selectedItems = ref<number[]>([]);

const tabItems = ref([
    { title: 'Terjadwal', value: 'Terjadwal', count: 0 },
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

// Bagian fetchRegistrations di Vue Anda
const fetchRegistrations = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;

  loading.value = true;
  try {
    const { data } = await axios.get('/api/registrations', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        status: activeTab.value,
        branches_id: branchId,
        with: 'customer,service',
      },
    });
    // Pastikan mapping datanya benar sesuai response pagination Laravel
    registrations.value = data.data.data; 
    totalRegistrations.value = data.data.total;
  } catch (error) {
    console.error('Gagal mengambil data:', error);
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
        // Perubahan status ini hanya digunakan untuk aksi Batal.
        await axios.patch(`/api/registrations/${item.id}/status`, { status: newStatus });
        loadBranchData(); // Muat ulang data setelah berhasil
    } catch (error) {
        console.error('Gagal mengubah status:', error);
        alert('Terjadi kesalahan saat mengubah status.'); 
        loading.value = false;
    }
}

const goToPayment = async (item: Registration) => {
    if (!confirm('Apakah layanan ini sudah selesai dikerjakan dan pembayaran sudah diterima? Aksi ini akan menandai status registrasi sebagai "Selesai".')) return;
    
    loading.value = true;
    try {
        await axios.patch(`/api/registrations/${item.id}/status`, { status: 'Selesai' });
        
        activeTab.value = 'Selesai';
        loadBranchData();
        
    } catch (error) {
        console.error('Gagal menandai selesai:', error);
        alert('Terjadi kesalahan saat mengubah status.');
    } finally {
        loading.value = false;
    }
}

const payMultiple = () => {
    alert('Fungsi ini dinonaktifkan.');
}

const getStatusColor = (status: string) => {
    if (status === 'Terjadwal') return 'blue';
    if (status === 'Batal') return 'error';
    return 'success'; // Untuk 'Selesai'
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