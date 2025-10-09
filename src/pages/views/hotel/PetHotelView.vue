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
      />
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
          <VAvatar size="32" class="me-3">
             <VImg :src="item.pet?.photo_url || 'https://placehold.co/40x40/eeeeee/cccccc?text=N/A'" />
          </VAvatar>
          <div class="d-flex flex-column">
            <span class="font-weight-medium">{{ item.pet?.name || '-' }}</span>
            <small class="text-medium-emphasis">{{ item.pet?.breed || 'N/A' }}</small>
          </div>
        </div>
      </template>

      <template #[`item.customer`]="{ item }">
        {{ item.customer?.name || '-' }}
      </template>

      <template #[`item.check_in`]="{ item }">
        {{ new Date(item.created_at).toLocaleDateString('id-ID') }}
      </template>
      
      <template #[`item.check_out`]="{ item }">
        {{ item.check_out_date ? new Date(item.check_out_date).toLocaleDateString('id-ID') : 'Belum Ditentukan' }}
      </template>
      
      <template #[`item.status`]="{ item }">
        <VChip :color="getStatusColor(item.status)" size="small">{{ item.status }}</VChip>
      </template>
      
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1 justify-end">
          <VBtn icon="mdi-eye" size="small" variant="text" />
          <VBtn icon="mdi-logout" size="small" variant="text" color="success" />
        </div>
      </template>

    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import axios from '@/plugins/axios';

const petHotelList = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalItems = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

const headers = [
  { title: 'HEWAN', key: 'pet', sortable: false, width: '25%' },
  { title: 'PEMILIK', key: 'customer', sortable: false },
  { title: 'CHECK-IN', key: 'check_in' },
  { title: 'CHECK-OUT', key: 'check_out' },
  { title: 'STATUS', key: 'status' },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const;

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

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
    const { data } = await axios.get('/api/pet-hotel', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId,
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

const getStatusColor = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'check-in' || lowerStatus === 'terjadwal') return 'info';
    if (lowerStatus === 'check-out' || lowerStatus === 'selesai') return 'success';
    return 'default';
}

onMounted(() => {
    fetchPetHotelData();
    window.addEventListener('branch-changed', fetchPetHotelData);
});

onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchPetHotelData);
});

watch(search, () => {
  options.value.page = 1;
  fetchPetHotelData();
});
</script>