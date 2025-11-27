<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Pembayaran Masuk</span>
      <VSpacer />
    </VCardTitle>

    <VCardText>
      <VRow>
        <VCol cols="12" md="4">
          <VTextField
            v-model="search"
            density="compact"
            label="Pencarian (No. Invoice / Customer)"
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
      <template #[`item.txns_no`]="{ item }">
        {{ item.order?.invoice_number || '-' }}
      </template>
      <template #[`item.user`]="{ item }">
        <div class="d-flex align-center">
            <VAvatar size="32" class="me-2" color="primary">
                <span class="text-caption">{{ getInitials(item.order?.user?.name) }}</span>
            </VAvatar>
            <span>{{ item.order?.user?.name || '-' }}</span>
        </div>
      </template>
      <!-- FIX: Menggunakan item.order.total untuk Amount untuk mewakili total uang masuk dari transaksi POS -->
      <template #[`item.amount`]="{ item }">
        {{ formatCurrency(item.amount) }}     
      </template>
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1 justify-end">
          <!-- Tombol Show Detail -->
          <VBtn 
            icon="mdi-eye" 
            size="small" 
            variant="text" 
            title="Lihat Detail Transaksi"
            @click="viewPaymentDetail(item)"
          />
          <!-- Tombol Cetak Struk (Saat ini hanya placeholder) -->
          <VBtn 
            icon="mdi-receipt-text-outline" 
            size="small" 
            variant="text" 
            title="Cetak Struk"
          />
        </div>
      </template>
    </VDataTableServer>
    
    <!-- === START: DIALOG DETAIL PEMBAYARAN === -->
    <VDialog v-model="showDetailDialog" max-width="800">
      <VCard v-if="itemDetail && itemDetail.order">
        <VCardTitle class="d-flex align-center bg-primary text-white">
          Detail Transaksi: {{ itemDetail.order.invoice_number }}
          <VSpacer />
          <VBtn icon="mdi-close" variant="text" @click="showDetailDialog = false" />
        </VCardTitle>

        <VCardText class="pt-6">
          <VRow>
            <!-- Kolom Info Dasar -->
            <VCol cols="12" md="4">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Customer</p>
              <p class="text-subtitle-1">{{ itemDetail.order.customer?.name || '-' }}</p>
            </VCol>
            <VCol cols="12" md="4">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Kasir / User</p>
              <p class="text-subtitle-1">{{ itemDetail.order.user?.name || '-' }}</p>
            </VCol>
            <VCol cols="12" md="4">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Tanggal & Waktu</p>
              <p class="text-subtitle-1">
                {{ new Date(itemDetail.order.order_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </VCol>
            <VCol cols="12" md="4">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Metode Bayar</p>
              <p class="text-subtitle-1">{{ itemDetail.payment_mode?.name || '-' }}</p>
            </VCol>
            <VCol cols="12" md="4">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Status Penjualan</p>
              <VChip :color="getStatusColor(itemDetail.order.order_status)" size="small">{{ itemDetail.order.order_status || '-' }}</VChip>
            </VCol>
            <VCol cols="12" md="4">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Status Pembayaran</p>
              <VChip :color="getStatusColor(itemDetail.order.payment_status)" size="small">{{ itemDetail.order.payment_status || '-' }}</VChip>
            </VCol>
          </VRow>
          
          <VDivider class="my-4" />
          
          <!-- Tabel Detail Item -->
          <h4 class="mb-3 text-subtitle-1 font-weight-bold">Item Transaksi</h4>
          <VTable density="compact" class="elevation-1 rounded">
            <thead>
              <tr>
                <th class="text-left">Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Harga Satuan</th>
                <th class="text-right">Subtotal Item</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in itemDetail.order.items" :key="item.id">
                <td class="text-left">{{ item.item_name }}</td>
                <td class="text-center">{{ item.quantity }}</td>
                <td class="text-right">{{ formatCurrency(item.unit_price) }}</td>
                <td class="text-right">{{ formatCurrency(item.subtotal) }}</td>
              </tr>
            </tbody>
          </VTable>

          <VDivider class="my-4" />

          <!-- Summary Keuangan -->
          <VRow justify="end">
            <VCol cols="12" md="6">
              <div class="d-flex justify-space-between text-subtitle-1 font-weight-medium mb-1">
                <span>Subtotal Penjualan</span>
                <span>{{ formatCurrency(itemDetail.order.subtotal) }}</span>
              </div>
              <div class="d-flex justify-space-between text-body-2 mb-1">
                <span>Diskon ({{ itemDetail.order.discount_id ? 'Tersedia' : 'Tidak Ada' }})</span>
                <span class="text-error">- {{ formatCurrency(itemDetail.order.total_discount) }}</span>
              </div>
              <div class="d-flex justify-space-between text-body-2 mb-3">
                <span>Pajak</span>
                <span class="text-success">+ {{ formatCurrency(itemDetail.order.total_tax) }}</span>
              </div>
              <div class="d-flex justify-space-between text-h6 font-weight-bold text-primary pt-2 border-t">
                <span>TOTAL BAYAR</span>
                <span>{{ formatCurrency(itemDetail.order.total) }}</span>
              </div>
            </VCol>
          </VRow>

        </VCardText>
        
        <VCardActions>
          <VSpacer />
          <VBtn color="secondary" variant="flat" @click="showDetailDialog = false">Tutup</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <!-- === END: DIALOG DETAIL PEMBAYARAN === -->

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

// State untuk Dialog Detail
const showDetailDialog = ref(false);
const itemDetail = ref<any>(null);

const headers = [
  { title: 'PAYMENT DATE', key: 'payment_date' },
  { title: 'TXNS NO', key: 'txns_no', sortable: false },
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
    console.error('Cabang aktif tidak ditemukan.'); 
    payments.value = [];
    totalPayments.value = 0;
    return;
  }

  loading.value = true;
  try {
    // Memastikan relasi dimuat untuk menampilkan detail di modal dan total amount
    const { data } = await axios.get('/api/payments', {
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
    if (lowerStatus === 'cancelled') return 'error'; 
    return 'default';
}

const getInitials = (name: string = '') => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const goToCreatePage = () => {
    router.push({ name: 'pos' }); 
}

const viewPaymentDetail = (item: any) => {
    itemDetail.value = item;
    showDetailDialog.value = true;
}

const cancelPayment = async (item: any) => {
    const orderId = item.order?.id;
    if (!orderId) return;

    if (window.confirm(`Apakah Anda yakin ingin MEMBATALKAN Transaksi (Invoice: ${item.order?.invoice_number})? Aksi ini akan mengembalikan stok produk.`)) {
        try {
            await axios.patch(`/api/payments/${orderId}/cancel`);
            console.log('Penjualan berhasil dibatalkan!');
            fetchPayments(); // Muat ulang data tabel
        } catch (error: any) {
            console.error('Gagal membatalkan pembayaran:', error);
            alert(`Gagal membatalkan penjualan: ${error.response?.data?.message || 'Terjadi kesalahan.'}`);
        }
    }
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