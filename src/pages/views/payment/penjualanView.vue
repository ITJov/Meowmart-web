<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Penjualan</span>
      <VSpacer />      
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
          <!-- Tombol Show -->
          <VBtn 
            icon="mdi-eye" 
            size="small" 
            variant="text" 
            title="Lihat Detail"
            @click="viewPaymentDetail(item)" 
          />
        </div>
      </template>
    </VDataTableServer>

    <!-- === START: DIALOG DETAIL PENJUALAN === -->
    <VDialog
      v-model="showDetailDialog"
      max-width="600"
    >
      <VCard v-if="itemDetail && itemDetail.order">
        <VCardTitle class="d-flex align-center bg-primary text-white">
          Detail Penjualan: {{ itemDetail.order.invoice_number }}
          <VSpacer />
          <VBtn icon="mdi-close" variant="text" @click="showDetailDialog = false" />
        </VCardTitle>

        <VCardText class="pt-6">
          <VRow dense>
            <VCol cols="12" md="6">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Customer</p>
              <p class="text-body-1">{{ itemDetail.order.customer?.name || '-' }}</p>
            </VCol>
            <VCol cols="12" md="6">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Tanggal Transaksi</p>
              <p class="text-body-1">
                {{ new Date(itemDetail.order.order_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </p>
            </VCol>
            <VCol cols="12" md="6">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Payment Status</p>
              <VChip :color="getStatusColor(itemDetail.order.payment_status)" size="small">{{ itemDetail.order.payment_status || '-' }}</VChip>
            </VCol>
            <VCol cols="12" md="6">
              <p class="text-caption text-uppercase font-weight-bold mb-1">Metode Pembayaran</p>
              <p class="text-body-1">{{ itemDetail.payment_mode?.name || '-' }}</p>
            </VCol>
          </VRow>
          
          <VDivider class="my-4" />

          <VRow>
            <VCol cols="12">
              <div class="d-flex justify-space-between text-subtitle-1 font-weight-bold">
                <span>Subtotal</span>
                <span>{{ formatCurrency(itemDetail.order.subtotal) }}</span>
              </div>
              <div class="d-flex justify-space-between">
                <span class="text-body-2">Diskon ({{ itemDetail.order.discount_id ? 'Tersedia' : 'Tidak Ada' }})</span>
                <span class="text-body-2">- {{ formatCurrency(itemDetail.order.total_discount) }}</span>
              </div>
              <div class="d-flex justify-space-between">
                <span class="text-body-2">Pajak ({{ itemDetail.order.tax_id ? 'Tersedia' : 'Tidak Ada' }})</span>
                <span class="text-body-2">+ {{ formatCurrency(itemDetail.order.total_tax) }}</span>
              </div>
            </VCol>
          </VRow>

          <VDivider class="my-4" />
          
          <VRow>
            <VCol cols="12">
              <div class="d-flex justify-space-between text-h6 font-weight-bold text-primary">
                <span>TOTAL BAYAR</span>
                <span>{{ formatCurrency(itemDetail.order.total) }}</span>
              </div>
            </VCol>
          </VRow>

          <p class="text-caption mt-4">Order diproses oleh: {{ itemDetail.order.user?.name || '-' }}</p>
          <p v-if="!itemDetail.order.items" class="text-caption text-medium-emphasis mt-3">
            *Detail item (produk/layanan) tidak dimuat. Mohon tambahkan relasi 'order.items' di backend jika diperlukan.
          </p>

        </VCardText>
        
        <VCardActions>
          <VSpacer />
          <VBtn color="secondary" variant="flat" @click="showDetailDialog = false">Tutup</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <!-- === END: DIALOG DETAIL PENJUALAN === -->

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

// === BARU: State untuk Dialog Detail ===
const showDetailDialog = ref(false);
const itemDetail = ref<any>(null);

const headers = [
  { title: 'NO INVOICE', key: 'order.invoice_number', sortable: false },
  { title: 'SALES DATE', key: 'order.order_date' },
  { title: 'CUSTOMER', key: 'customer', sortable: false },
  { title: 'TOTAL AMOUNT', key: 'total_amount', sortable: false },
  { title: 'PAYMENT STATUS', key: 'payment_status', sortable: false },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' }, // Ubah align
] as const;

const getActiveBranchId = () => {
    // Fungsi untuk mendapatkan ID Cabang
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const fetchPayments = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    // Gunakan cara non-alert di production jika ini adalah aplikasi Vuetify/Vue
    console.error('Cabang aktif tidak ditemukan.'); 
    payments.value = [];
    totalPayments.value = 0;
    return;
  }

  loading.value = true;
  try {
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
    if (lowerStatus === 'cancelled') return 'error'; // Tambahkan status Batal
    return 'default';
}

const goToCreatePage = () => {
    router.push({ name: 'pos' }); 
}

const viewPaymentDetail = (item: any) => {
    // === PERUBAHAN UTAMA DI SINI ===
    itemDetail.value = item;
    showDetailDialog.value = true;
    console.log(`Membuka detail Order ID: ${item.order?.id}`);
}

const cancelPayment = async (item: any) => {
    const orderId = item.order?.id;
    if (!orderId) return;

    // Di lingkungan produksi, ganti confirm() dengan dialog modal kustom Vuetify
    if (window.confirm(`Apakah Anda yakin ingin MEMBATALKAN Order dengan Invoice: ${item.order?.invoice_number}? Aksi ini akan mengembalikan stok produk.`)) {
        try {
            // Menggunakan PATCH ke endpoint baru
            await axios.patch(`/api/payments/${orderId}/cancel`);
            console.log('Penjualan berhasil dibatalkan!');
            fetchPayments(); // Muat ulang data tabel
        } catch (error: any) {
            console.error('Gagal membatalkan pembayaran:', error);
            // Tampilkan pesan error kepada user
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