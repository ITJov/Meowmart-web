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
            label="Pencarian (No. Transaksi / Invoice Pembelian)"
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
      <template #[`item.source`]="{ item }">
        <span v-if="item.purchase">
            <VIcon size="small" class="mr-1" color="info">mdi-basket</VIcon> Pembelian: {{ item.purchase.invoice_number }}
        </span>
        <span v-else>{{ item.notes || '-' }}</span>
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
        <span class="text-error font-weight-bold">{{ formatCurrency(item.amount) }}</span>
      </template>
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1 justify-end">
          <VBtn icon="mdi-eye" size="small" variant="text" title="Lihat Detail" @click="viewDetail(item)" />
          <VBtn icon="mdi-pencil" size="small" variant="text" title="Edit Pembayaran" @click="editPayment(item)" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" title="Hapus Permanen" @click="deletePayment(item)" />
        </div>
      </template>
    </VDataTableServer>

    <!-- === START: DIALOG DETAIL PEMBAYARAN KELUAR === -->
    <VDialog v-model="showDetailDialog" max-width="500">
      <VCard v-if="detailItem">
        <VCardTitle class="bg-info text-white d-flex align-center">
            Detail Pembayaran Keluar
            <VSpacer/>
            <VBtn icon="mdi-close" variant="text" @click="showDetailDialog = false"/>
        </VCardTitle>
        <VCardText class="pt-6">
            <VList lines="one">
                <VListItem title="No. Transaksi" :subtitle="detailItem.transaction_number"/>
                <VListItem title="Tanggal Pembayaran" :subtitle="new Date(detailItem.payment_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })"/>
                <VListItem title="Jumlah Keluar" :subtitle="formatCurrency(detailItem.amount)" class="text-error font-weight-bold"/>
                <VListItem title="Dicatat Oleh" :subtitle="detailItem.user?.name || '-'"/>
                <VListItem title="Sumber Pembayaran" :subtitle="detailItem.purchase?.invoice_number ? `Pembelian: ${detailItem.purchase.invoice_number}` : 'Biaya Operasional'"/>
                <VListItem title="Catatan" :subtitle="detailItem.notes || '-'"/>
            </VList>
        </VCardText>
        <VCardActions>
            <VSpacer/>
            <VBtn @click="showDetailDialog = false">Tutup</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <!-- === END: DIALOG DETAIL PEMBAYARAN KELUAR === -->

    <!-- === START: DIALOG EDIT PEMBAYARAN KELUAR === -->
    <VDialog v-model="showEditDialog" max-width="600" persistent>
      <VCard :loading="loadingModal">
        <VCardTitle class="bg-info text-white d-flex align-center">
            Edit Pembayaran Keluar
            <VSpacer/>
            <VBtn icon="mdi-close" variant="text" @click="closeEditDialog" :disabled="isSaving"/>
        </VCardTitle>
        <VForm ref="refEditForm" @submit.prevent="submitEdit">
            <VCardText class="pt-6">
                <VTextField
                    v-model="editForm.transaction_number"
                    label="No. Transaksi"
                    variant="outlined"
                    density="compact"
                    readonly
                    class="mb-3"
                />
                <VTextField
                    v-model="editForm.payment_date"
                    label="Tanggal Pembayaran"
                    type="date"
                    :rules="[v => !!v || 'Tanggal wajib diisi']"
                    variant="outlined"
                    density="compact"
                    class="mb-3"
                />
                <VTextField
                    v-model.number="editForm.amount"
                    label="Jumlah Keluar (Rp)"
                    type="number"
                    :rules="[v => !!v || 'Jumlah wajib diisi', v => v > 0 || 'Jumlah harus lebih dari 0']"
                    variant="outlined"
                    density="compact"
                    prefix="Rp"
                    class="mb-3"
                />
                <VAutocomplete
                    v-model="editForm.purchase_id"
                    :items="unpaidPurchases"
                    item-title="invoice_number"
                    item-value="id"
                    label="Opsional: Terkait Invoice Pembelian (Hutang)"
                    variant="outlined"
                    density="compact"
                    clearable
                    :loading="loadingPurchases"
                    hint="Memilih invoice akan menghapus kaitan yang ada jika purchase_id sebelumnya diisi."
                    persistent-hint
                    class="mb-3"
                >
                     <template #item="{ props, item }">
                        <VListItem 
                            v-bind="props" 
                            :subtitle="`Supplier: ${item.raw.supplier || 'N/A'} | Total Hutang: ${formatCurrency(item.raw.total_amount)}`"
                        >
                            <VListItemTitle>Invoice: {{ item.raw.invoice_number }}</VListItemTitle>
                        </VListItem>
                    </template>
                </VAutocomplete>
                <VTextarea
                    v-model="editForm.notes"
                    label="Catatan (Tujuan Biaya)"
                    variant="outlined"
                    rows="3"
                />
                <VAlert v-if="editForm.purchase_id" type="info" variant="tonal" class="mt-4">
                    Saat ini terkait dengan Pembelian: {{ editForm.purchase?.invoice_number || 'N/A' }}.
                </VAlert>
            </VCardText>
            <VCardActions class="pa-4">
                <VSpacer/>
                <VBtn color="secondary" variant="outlined" @click="closeEditDialog" :disabled="isSaving">Batal</VBtn>
                <VBtn color="info" variant="flat" type="submit" :loading="isSaving">Simpan Perubahan</VBtn>
            </VCardActions>
        </VForm>
      </VCard>
    </VDialog>
    <!-- === END: DIALOG EDIT PEMBAYARAN KELUAR === -->

  </VCard>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '../../../plugins/axios'
import type { VForm } from 'vuetify/components';

const router = useRouter();
const payments = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalPayments = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

// --- STATE MODAL ---
const showDetailDialog = ref(false);
const detailItem = ref<any>(null);
const showEditDialog = ref(false);
const isSaving = ref(false); // Untuk status submit tombol
const loadingModal = ref(false); // Untuk status loading data modal
const editForm = ref<any>({});
const refEditForm = ref<VForm | null>(null); 
// --- BARU ---
const unpaidPurchases = ref<any[]>([]);
const loadingPurchases = ref(false);
// -------------

const headers = [
  { title: 'PAYMENT DATE', key: 'payment_date' },
  { title: 'TXNS NO', key: 'transaction_number', sortable: false },
  { title: 'SUMBER', key: 'source', sortable: false }, // BARU
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

// --- FETCH PURCHASE UNPAID ---
const fetchUnpaidPurchases = async () => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    loadingPurchases.value = true;
    try {
        const { data } = await axios.get('/api/purchases', { 
            params: { branches_id: branchId, payment_status: 'Unpaid,Partial', limit: 100 }
        });
        if(data && data.data && data.data.data) {
            unpaidPurchases.value = data.data.data;
        }
    } catch (error) {
        console.error("Gagal memuat daftar hutang pembelian:", error);
    } finally {
        loadingPurchases.value = false;
    }
}
// ------------------------------------

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
    router.push({ name: 'addPembayaranKeluar-management' }); 
}


const viewDetail = (item: any) => {
    detailItem.value = item;
    showDetailDialog.value = true;
}

const editPayment = async (item: any) => {
    loadingModal.value = true; // MULAI LOADING MODAL PADA KARTU
    
    // 1. Pastikan data pembelian yang belum lunas sudah dimuat untuk dropdown
    if (unpaidPurchases.value.length === 0) {
        await fetchUnpaidPurchases();
    }

    try {
        // 2. FETCH DETAIL TRANSAKSI
        const { data } = await axios.get(`/api/payments-out/${item.id}`);
        const paymentOut = data.data;

        // Populate Form
        editForm.value = {
            id: paymentOut.id,
            transaction_number: paymentOut.transaction_number,
            payment_date: new Date(paymentOut.payment_date).toISOString().substr(0, 10),
            amount: paymentOut.amount,
            notes: paymentOut.notes,
            purchase_id: paymentOut.purchase_id,
            purchase: paymentOut.purchase || {}, // Penanganan null yang aman
        };
        showEditDialog.value = true; // Buka modal hanya setelah data diisi
    } catch (error) {
        console.error("Gagal memuat detail edit:", error);
        alert(`Gagal memuat data edit. Cek konsol untuk detail.`);
    } finally {
        loadingModal.value = false; // AKHIRI LOADING MODAL
    }
}

const closeEditDialog = () => {
    showEditDialog.value = false;
    editForm.value = {}; // Reset form
    refEditForm.value?.resetValidation(); // Reset validasi Vuetify
}

const submitEdit = async () => {
    // Validasi Vuetify
    const validationResult = await refEditForm.value?.validate();
    if (!validationResult || !validationResult.valid) return;
    
    if (editForm.value.amount <= 0) {
        alert('Jumlah harus lebih dari nol.');
        return;
    }

    isSaving.value = true; // Gunakan isSaving untuk tombol submit
    try {
        // Kirim data yang diizinkan untuk update ke backend
        await axios.put(`/api/payments-out/${editForm.value.id}`, {
            payment_date: editForm.value.payment_date,
            amount: editForm.value.amount,
            notes: editForm.value.notes,
            purchase_id: editForm.value.purchase_id || null, 
        });

        alert('Pembayaran keluar berhasil diperbarui.');
        closeEditDialog();
        fetchPayments(); // Muat ulang tabel
    } catch (error: any) {
        console.error('Gagal menyimpan perubahan:', error);
        alert(`Gagal menyimpan: ${error.response?.data?.message || 'Terjadi kesalahan.'}`);
    } finally {
        isSaving.value = false;
    }
}

const deletePayment = async (item: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus transaksi ${item.transaction_number} secara permanen?`)) return;

    try {
        await axios.delete(`/api/payments-out/${item.id}`);
        alert('Transaksi berhasil dihapus.');
        fetchPayments();
    } catch (error: any) {
        console.error('Gagal menghapus transaksi:', error);
        alert(`Gagal menghapus: ${error.response?.data?.message || 'Terjadi kesalahan.'}`);
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