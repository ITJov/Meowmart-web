<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Penjualan</span>
      <VSpacer />
      <VBtn color="primary" @click="goToCreatePage">
        <VIcon icon="mdi-plus" start />
        Tambah Penjualan Baru
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
      :items="payments"
      :items-length="totalPayments"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchPayments"
    >
      <!-- Slot ini digunakan untuk kustomisasi tampilan kolom 'NO INVOICE' -->
      <template #[`item.order.invoice_number`]="{ item }">
        {{ item.order?.invoice_number || '-' }}
      </template>

      <!-- Slot ini untuk memformat tampilan kolom 'SALES DATE' -->
      <template #[`item.order.order_date`]="{ item }">
        {{ new Date(item.order?.order_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}
      </template>

      <!-- Slot ini untuk menampilkan nama customer dari data relasi -->
      <template #[`item.customer`]="{ item }">
        {{ item.order?.customer?.name || '-' }}
      </template>

      <!-- Slot ini untuk menampilkan status penjualan sebagai VChip -->
      <template #[`item.sale_status`]="{ item }">
        <VChip :color="getStatusColor(item.order?.order_status)" size="small">{{ item.order?.order_status || '-' }}</VChip>
      </template>

      <!-- Slot ini untuk memformat total bayar sebagai mata uang -->
      <template #[`item.total_amount`]="{ item }">
        {{ formatCurrency(item.order?.total) }}
      </template>

      <!-- Slot ini untuk menampilkan status pembayaran sebagai VChip -->
      <template #[`item.payment_status`]="{ item }">
        <VChip :color="getStatusColor(item.order?.payment_status)" size="small">{{ item.order?.payment_status || '-' }}</VChip>
      </template>

      <!-- Slot ini untuk menampilkan tombol aksi di akhir setiap baris -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1 justify-end">
          <VBtn icon="mdi-eye" size="small" variant="text" />
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
const payments = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalPayments = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

// Header ini sudah benar, dan sekarang akan digunakan oleh VDataTableServer
const headers = [
  { title: 'NO INVOICE', key: 'order.invoice_number', sortable: false },
  { title: 'SALES DATE', key: 'order.order_date' },
  { title: 'CUSTOMER', key: 'customer', sortable: false },
  { title: 'SALES STATUS', key: 'sale_status', sortable: false },
  { title: 'TOTAL AMOUNT', key: 'total_amount', sortable: false },
  { title: 'PAYMENT STATUS', key: 'payment_status', sortable: false },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'center' },
] as const;

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const fetchPayments = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    alert('Cabang aktif tidak ditemukan.');
    payments.value = [];
    totalPayments.value = 0;
    return;
  }

  loading.value = true;
  try {
    const { data } = await axios.get('/api/payment', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId,
      },
    });
    if (data && data.data) {
      payments.value = data.data.data;
      totalPayments.value = data.data.total;
    }
  } catch (error) {
    console.error('Gagal mengambil data pembayaran:', error);
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const getStatusColor = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'paid' || lowerStatus === 'selesai' || lowerStatus === 'completed') return 'success';
    if (lowerStatus === 'unpaid' || lowerStatus === 'pending') return 'warning';
    return 'default';
}

const goToCreatePage = () => {
    router.push({ name: 'pos' }); 
}

onMounted(() => {
    fetchPayments();
    window.addEventListener('branch-changed', fetchPayments);
});

onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchPayments);
});

watch(search, () => {
  options.value.page = 1;
  fetchPayments();
});
</script>

