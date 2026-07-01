<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Monitor Pet Hotel</span>
      <VSpacer />
      <VTextField
        v-model="search"
        density="compact"
        label="Cari Nama Hewan/Pemilik"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        hide-details
        clearable
        style="max-width: 300px;"
        class="me-2"
      />
      <VBtn icon="mdi-refresh" variant="text" @click="fetchPetHotelData" />
    </VCardTitle>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="petHotelList"
      :items-length="totalItems"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchPetHotelData"
    >
      <template #[`item.pet`]="{ item }">
        <div class="d-flex align-center py-2">
          <VAvatar size="40" rounded class="me-3">
             <VImg :src="item.pet?.photo_url || 'https://placehold.co/40x40/eeeeee/cccccc?text=P'" />
          </VAvatar>
          <div class="d-flex flex-column">
            <span class="font-weight-medium">{{ item.pet?.name || '-' }}</span>
            <small class="text-medium-emphasis text-caption">{{ item.pet?.breed || 'N/A' }}</small>
          </div>
        </div>
      </template>

      <template #[`item.customer`]="{ item }">
        <div class="d-flex flex-column">
            <span class="font-weight-medium">{{ item.customer?.name || '-' }}</span>
            <small class="text-medium-emphasis text-caption">{{ item.customer?.phone || 'No Telp' }}</small>
        </div>
      </template>

      <!-- PERBAIKAN: Menggunakan KEY start_date -->
      <template #[`item.start_date`]="{ item }">
        {{ formatDate(item.start_date) }} 
      </template>
      
      <!-- PERBAIKAN: Menggunakan KEY end_date -->
      <template #[`item.end_date`]="{ item }">
        <VChip size="small" :color="item.end_date ? 'default' : 'warning'" variant="tonal">
            {{ item.end_date ? formatDate(item.end_date) : 'Belum Selesai' }}
        </VChip>
      </template>
      
      <template #[`item.status`]="{ item }">
        <VChip :color="getStatusColor(item.status)" size="small" label>{{ item.status }}</VChip>
      </template>
      
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1 justify-end">
          <VBtn 
            icon="mdi-logout" 
            size="small" 
            variant="flat" 
            color="success"
            @click="handleCheckout(item)"
            :disabled="isCheckoutDisabled(item)">
             Check-out
          </VBtn>
        </div>
      </template>

    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import axios from '../../../plugins/axios'

// --- State Management ---
const petHotelList = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalItems = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

// --- Headers ---
const headers = [
  { title: 'HEWAN', key: 'pet', sortable: false, width: '25%' },
  { title: 'PEMILIK', key: 'customer', sortable: false },
  { title: 'CHECK-IN', key: 'start_date' }, // DIUBAH: Key sesuai kolom database
  { title: 'CHECK-OUT', key: 'end_date' },   // DIUBAH: Key sesuai kolom database
  { title: 'STATUS', key: 'status' },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const;

// --- Helper Functions ---
const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}
const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID'); 
}

// --- API Call ---
const fetchPetHotelData = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    alert('Cabang aktif tidak ditemukan.');
    petHotelList.value = [];
    totalItems.value = 0;
    return;
  }

  loading.value = true;
  try {
    // Memanggil endpoint registrasi dengan filter tipe hotel
    const { data } = await axios.get('/api/registrations', { 
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId,
        registration_type: 'Pet Hotel', 
        // 🚀 PASTIKAN INI DIKIRIM KE BACKEND
        exclude_statuses: ['Selesai', 'Batal'], 
      },
    });
    
    if (data && data.data) {
      petHotelList.value = data.data.data; 
      totalItems.value = data.data.total; 
    }
  } catch (error) {
    console.error('Gagal mengambil data Pet Hotel:', error);
  } finally {
    loading.value = false;
  }
};

// --- UI Logic ---
const getStatusColor = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'terjadwal') return 'blue';
    if (lowerStatus === 'batal') return 'error';
    if (lowerStatus === 'check-in') return 'success'; // Status baru
    return 'grey'; 
}

const normalizeDate = (dateString: string) => {
    // Memastikan waktu diset ke tengah malam untuk perbandingan tanggal yang akurat
    return new Date(dateString.split('T')[0]); 
};
const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

const isCheckoutDisabled = (item: any) => {
    const status = item.status?.toLowerCase();
    
    // Nonaktif jika sudah Selesai atau Batal (walaupun seharusnya sudah difilter di backend)
    if (status === 'selesai' || status === 'batal') {
        return true;
    }

    const endDate = item.end_date;
    if (!endDate) {
        return true; 
    }
    
    try {
        const todayDate = normalizeDate(new Date().toISOString()); 
        const checkOutDate = normalizeDate(endDate); 

        // Tombol DISABLED JIKA hari ini < tanggal check-out
        // Ini memastikan tombol hanya aktif JIKA (todayDate >= checkOutDate)
        return todayDate.getTime() < checkOutDate.getTime();
        
    } catch (e) {
        console.error("Gagal membandingkan tanggal:", e);
        return true;
    }
};

// --- FUNGSI CHECKOUT ---
const handleCheckout = async (item: any) => {
  const petName = item.pet?.name || 'hewan ini';
  
  // 🚀 Tambahkan pemeriksaan status tambahan untuk mencegah check-out item terjadwal yang belum tiba
  if (isCheckoutDisabled(item)) {
      alert(`Layanan ${petName} belum tiba waktunya Check-out (${formatDate(item.end_date)}).`);
      return;
  }
  
  if (!confirm(`Apakah Anda yakin ingin check-out ${petName}? Aksi ini akan menandai layanan sebagai "Selesai" di sistem.`)) return;

  loading.value = true;
  try {
    // Aksi ini menandai registrasi sebagai Selesai/Check-out
    await axios.patch(`/api/registrations/${item.id}/status`, {
      status: 'Selesai', 
    });

    // Muat ulang data.
    fetchPetHotelData();
    alert(`Check-out ${petName} berhasil dan layanan ditandai Selesai.`);

  } catch (error) {
    console.error('Gagal melakukan check-out:', error);
    alert('Terjadi kesalahan saat melakukan check-out.');
    loading.value = false; 
  }
};

// --- Lifecycle Hooks ---
onMounted(() => {
    fetchPetHotelData();
    window.addEventListener('branch-changed', fetchPetHotelData);
});

onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchPetHotelData);
});

// --- Watchers ---
watch(search, () => {
  options.value.page = 1;
  fetchPetHotelData();
});
</script>