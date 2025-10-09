<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Pengadaan Produk</span>
      <VSpacer />
      <VBtn color="primary" @click="goToCreatePage">
        <VIcon icon="mdi-plus" start />
        Tambah Pengadaan Baru
      </VBtn>
    </VCardTitle>

    <VCardText>
      <VRow>
        <VCol cols="12" md="4">
          <VTextField
            v-model="search"
            density="compact"
            label="Masukan No. Invoice"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            clearable
          />
        </VCol>
      </VRow>
    </VCardText>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="purchases"
      :items-length="totalPurchases"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchPurchases"
    >
      <template #[`item.purchase_date`]="{ item }">
        {{ new Date(item.purchase_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}
      </template>
      <template #[`item.supplier`]="{ item }">
        {{ item.supplier?.name || 'N/A' }}
      </template>
       <template #[`item.total_amount`]="{ item }">
        {{ formatCurrency(item.total_amount) }}
      </template>
      <template #[`item.purchase_status`]="{ item }">
        <VChip :color="getStatusColor(item.purchase_status)" size="small">{{ item.purchase_status }}</VChip>
      </template>
      <template #[`item.payment_status`]="{ item }">
        <VChip :color="getStatusColor(item.payment_status)" size="small">{{ item.payment_status }}</VChip>
      </template>
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1 justify-end">
          <VBtn icon="mdi-pencil" size="small" variant="text" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" />
        </div>
      </template>
    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';

const router = useRouter();
const purchases = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalPurchases = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

const headers = [
  { title: 'NO INVOICE', key: 'invoice_number', sortable: false },
  { title: 'PURCHASE DATE', key: 'purchase_date' },
  { title: 'SUPPLIER', key: 'supplier', sortable: false },
  { title: 'PURCHASE STATUS', key: 'purchase_status' },
  { title: 'TOTAL AMOUNT', key: 'total_amount' },
  { title: 'PAYMENT STATUS', key: 'payment_status' },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const;

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const fetchPurchases = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    alert('Cabang aktif tidak ditemukan.');
    return;
  }

  loading.value = true;
  try {
    const { data } = await axios.get('/api/purchases', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId,
      },
    });
    if (data && data.data) {
      purchases.value = data.data.data;
      totalPurchases.value = data.data.total;
    }
  } catch (error) {
    console.error('Gagal mengambil data pengadaan:', error);
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const getStatusColor = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (['selesai', 'paid', 'terkirim', 'diterima'].includes(lowerStatus)) return 'success';
    if (['diproses', 'dikirim'].includes(lowerStatus)) return 'info';
    if (['dikembalikan', 'batal'].includes(lowerStatus)) return 'error';
    if (['unpaid', 'menunggu pembayaran'].includes(lowerStatus)) return 'warning';
    return 'default';
}

const goToCreatePage = () => {
    router.push({ name: 'add-purchases' }); // Sesuaikan dengan nama route Anda
}

onMounted(() => {
    fetchPurchases();
    window.addEventListener('branch-changed', fetchPurchases);
});

onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchPurchases);
});

watch(search, () => {
  options.value.page = 1;
  fetchPurchases();
});
</script>
