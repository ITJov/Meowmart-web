<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Pembayaran Keluar</span>
      <VSpacer />
      <VBtn color="primary" @click="goToCreatePage">
        <VIcon icon="mdi-plus" start />
        Tambah Pembayaran Baru
      </VBtn>
    </VCardTitle>

    <VCardText>
      <VRow>
        <VCol cols="12" md="4">
          <VTextField
            v-model="search"
            density="compact"
            label="Pencarian"
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
      <template #[`item.payment_date`]="{ item }">
        {{ new Date(item.payment_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}
      </template>
      <template #[`item.user`]="{ item }">
        <div class="d-flex align-center">
            <VAvatar size="32" class="me-2" color="primary" variant="tonal">
                <span class="text-caption">{{ getInitials(item.user?.name) }}</span>
            </VAvatar>
            <span>{{ item.user?.name || '-' }}</span>
        </div>
      </template>
      <template #[`item.amount`]="{ item }">
        {{ formatCurrency(item.amount) }}
      </template>
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1 justify-end">
          <VBtn icon="mdi-eye" size="small" variant="text" />
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
const payments = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalPayments = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

const headers = [
  { title: 'PAYMENT DATE', key: 'payment_date' },
  { title: 'TXNS NO', key: 'transaction_number', sortable: false },
  { title: 'USER', key: 'user', sortable: false },
  { title: 'AMOUNT', key: 'amount' },
  { title: 'ACTIONS', key: 'actions', sortable: false, align: 'end' },
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
    return;
  }

  loading.value = true;
  try {
    // DIUBAH: Endpoint API disesuaikan dengan nama baru
    const { data } = await axios.get('/api/payments-out', {
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
    console.error('Gagal mengambil data pembayaran keluar:', error);
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const getInitials = (name: string = '') => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const goToCreatePage = () => {
    // DIUBAH: Nama route disesuaikan agar konsisten
    router.push({ name: 'add-payment-out' }); 
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

