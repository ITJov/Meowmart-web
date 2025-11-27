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
        {{ item.supplier || 'N/A' }}
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
          <VBtn 
            icon="mdi-pencil" 
            size="small" 
            variant="text" 
            title="Edit Pengadaan"
            color="info"
            @click="editPurchase(item)" 
          />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" title="Hapus Pengadaan" />
        </div>
      </template>
    </VDataTableServer>

    <!-- === START: DIALOG EDIT PENGADAAN === -->
    <VDialog v-model="showEditDialog" max-width="900" persistent>
        <VCard :loading="isSaving">
            <VCardTitle class="d-flex align-center pa-4">
                <span class="text-h5">Edit Pengadaan: {{ editForm.invoice_number }}</span>
                <VSpacer />
                <VBtn icon="mdi-close" variant="text" size="small" @click="closeEditDialog" :disabled="isSaving" />
            </VCardTitle>
            <VDivider />

            <VForm ref="refEditForm" @submit.prevent="submitEdit">
                <VCardText class="pt-6">
                    <!-- Bagian 1: Informasi Dasar -->
                    <VRow>
                        <VCol cols="12" md="4">
                            <VTextField
                            v-model="editForm.supplier"
                            label="Nama Supplier"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="compact"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <VTextField
                            v-model="editForm.purchase_date"
                            label="Tanggal Pembelian"
                            type="date"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="compact"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <VTextField
                            :model-value="branchName" 
                            label="Cabang"
                            readonly
                            variant="filled"
                            density="compact"
                            />
                        </VCol>
                        <VCol cols="12" md="6">
                            <VSelect
                            v-model="editForm.purchase_status"
                            :items="['Diproses', 'Selesai', 'Dibatalkan']"
                            label="Status Pengadaan"
                            variant="outlined"
                            density="compact"
                            :rules="[requiredValidator]"
                            hint="Status 'Selesai' akan menyesuaikan stok produk."
                            persistent-hint
                            />
                        </VCol>
                        <VCol cols="12" md="6">
                            <VSelect
                            v-model="editForm.payment_status"
                            :items="['Unpaid', 'Paid', 'Partial']"
                            label="Status Pembayaran"
                            variant="outlined"
                            density="compact"
                            :rules="[requiredValidator]"
                            />
                        </VCol>
                    </VRow>

                    <VDivider class="my-6" />

                    <!-- Bagian 2: Item Produk -->
                    <div class="d-flex justify-space-between align-center mb-4">
                        <h6 class="text-h6 font-weight-bold">Daftar Item Produk</h6>
                        <VBtn color="primary" size="small" prepend-icon="mdi-plus" @click="addItem">
                            Tambah Item
                        </VBtn>
                    </div>

                    <VTable class="text-no-wrap border rounded mb-4">
                        <thead>
                            <tr>
                            <th style="width: 30%;">Produk</th>
                            <th style="width: 15%;">Qty</th>
                            <th style="width: 25%;">Harga Beli (Satuan)</th>
                            <th style="width: 25%;">Subtotal</th>
                            <th style="width: 5%;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in editForm.items" :key="index">
                            <td>
                                <VAutocomplete
                                v-model="item.product_id"
                                :items="productList"
                                item-title="name"
                                item-value="id"
                                placeholder="Pilih Produk"
                                variant="outlined"
                                density="compact"
                                hide-details
                                :rules="[requiredValidator]"
                                class="my-2"
                                />
                            </td>
                            <td>
                                <VTextField
                                v-model.number="item.quantity"
                                type="number"
                                min="1"
                                variant="outlined"
                                density="compact"
                                hide-details
                                class="my-2"
                                />
                            </td>
                            <td>
                                <VTextField
                                v-model.number="item.unit_price" 
                                prefix="Rp"
                                variant="outlined"
                                density="compact"
                                hide-details
                                class="my-2"
                                type="number"
                                />
                            </td>
                            <td>
                                <VTextField
                                :model-value="formatCurrency(item.quantity * item.unit_price)"
                                readonly
                                variant="filled"
                                density="compact"
                                hide-details
                                class="my-2"
                                />
                            </td>
                            <td class="text-center">
                                <VBtn icon="mdi-delete" color="error" variant="text" size="small" @click="removeItem(index)" />
                            </td>
                            </tr>
                            <tr v-if="editForm.items.length === 0">
                            <td colspan="5" class="text-center text-medium-emphasis py-4">
                                Belum ada item. Klik "Tambah Item" untuk memulai.
                            </td>
                            </tr>
                        </tbody>
                    </VTable>

                    <!-- Bagian 3: Ringkasan & Catatan -->
                    <VRow>
                        <VCol cols="12" md="8">
                            <VTextarea
                            v-model="editForm.notes"
                            label="Catatan / Keterangan"
                            variant="outlined"
                            rows="3"
                            placeholder="Contoh: Barang diantar kurir JNE..."
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <VCard variant="outlined" class="pa-4 bg-grey-lighten-4">
                            <div class="d-flex justify-space-between align-center text-h6 font-weight-bold">
                                <span>Total Akhir:</span>
                                <span class="text-primary">{{ formatCurrency(grandTotal) }}</span>
                            </div>
                            </VCard>
                        </VCol>
                    </VRow>
                </VCardText>

                <VDivider />

                <VCardActions class="pa-4">
                    <VSpacer />
                    <VBtn variant="outlined" color="secondary" class="mr-2" @click="closeEditDialog" :disabled="isSaving">
                        Batal
                    </VBtn>
                    <VBtn 
                        type="submit" 
                        color="primary" 
                        variant="flat" 
                        :loading="isSaving"
                        :disabled="editForm.items.length === 0"
                    >
                        Simpan Perubahan
                    </VBtn>
                </VCardActions>
            </VForm>
        </VCard>
    </VDialog>
    <!-- === END: DIALOG EDIT PENGADAAN === -->
  </VCard>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';
import type { VForm } from 'vuetify/components';

// --- STATE TABLE ---
const router = useRouter();
const purchases = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalPurchases = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

// --- STATE EDIT MODAL ---
const showEditDialog = ref(false);
const isSaving = ref(false);
const refEditForm = ref<VForm>();
const productList = ref<any[]>([]);
const branchName = ref('');

const editForm = ref({
  id: null as number | null,
  invoice_number: '',
  branches_id: null as number | null,
  supplier: '',
  purchase_date: new Date().toISOString().substr(0, 10),
  purchase_status: 'Diproses',
  payment_status: 'Unpaid',
  notes: '',
  items: [] as Array<{ product_id: number | null; quantity: number; unit_price: number }>
});
const requiredValidator = (v: any) => !!v || 'Wajib diisi';

// --- COMPUTED ---
const grandTotal = computed(() => {
  return editForm.value.items.reduce((sum, item) => {
    return sum + (Number(item.quantity || 0) * Number(item.unit_price || 0));
  }, 0);
});

// --- UTILS ---
const headers = [
  { title: 'NO INVOICE', key: 'invoice_number', sortable: false },
  { title: 'PURCHASE DATE', key: 'purchase_date' },
  { title: 'SUPPLIER', key: 'supplier', sortable: false },
  { title: 'PURCHASE STATUS', key: 'purchase_status' },
  { title: 'TOTAL AMOUNT', key: 'total_amount' },
  { title: 'PAYMENT STATUS', key: 'payment_status' },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const;

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const getStatusColor = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (['selesai', 'paid', 'terkirim', 'diterima'].includes(lowerStatus)) return 'success';
    if (['diproses', 'dikirim'].includes(lowerStatus)) return 'info';
    if (['dikembalikan', 'batal', 'cancelled'].includes(lowerStatus)) return 'error';
    if (['unpaid', 'menunggu pembayaran'].includes(lowerStatus)) return 'warning';
    return 'default';
}

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) {
      const branch = JSON.parse(activeBranchString);
      branchName.value = branch.name;
      return branch.id;
    }
    return null;
}

const goToCreatePage = () => {
    router.push({ name: 'add-purchases' });
}

// --- ITEM ACTIONS (IN MODAL) ---
const addItem = () => {
  editForm.value.items.push({ product_id: null, quantity: 1, unit_price: 0 });
};

const removeItem = (index: number) => {
  editForm.value.items.splice(index, 1);
};

// --- FETCHING DATA ---

const fetchPurchases = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    console.error('Cabang aktif tidak ditemukan.');
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

const fetchProducts = async () => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    try {
        const { data } = await axios.get('/api/products', { 
            params: { branches_id: branchId, limit: 1000 }
        });
        if(data && data.data) {
            // Asumsi produk list ada di data.data atau data.data.data
            productList.value = data.data.data || data.data; 
        }
    } catch (error) {
        console.error("Gagal memuat produk:", error);
    }
}

const fetchPurchaseDetails = async (id: number) => {
    isSaving.value = true; // Gunakan isSaving untuk loading modal
    try {
        const { data } = await axios.get(`/api/purchases/${id}`);
        const purchase = data.data;
        
        // Reset dan Populate Form
        editForm.value = {
            id: purchase.id,
            invoice_number: purchase.invoice_number,
            branches_id: purchase.branches_id,
            supplier: purchase.supplier,
            purchase_date: new Date(purchase.purchase_date).toISOString().substr(0, 10),
            purchase_status: purchase.purchase_status,
            payment_status: purchase.payment_status,
            notes: purchase.notes || '',
            items: purchase.items.map((item: any) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price 
            }))
        };

        showEditDialog.value = true;
    } catch (error) {
        console.error("Gagal memuat detail pengadaan:", error);
        alert("Gagal memuat data. Transaksi mungkin tidak ditemukan.");
    } finally {
        isSaving.value = false;
    }
}

// --- MODAL ACTIONS ---
const editPurchase = (item: any) => {
    // 1. Muat daftar produk jika belum ada
    if (productList.value.length === 0) {
        fetchProducts(); 
    }
    // 2. Ambil detail purchase dan buka modal
    fetchPurchaseDetails(item.id);
}

const closeEditDialog = () => {
    showEditDialog.value = false;
    // Reset form setelah ditutup
    editForm.value = { 
        id: null, invoice_number: '', branches_id: null, supplier: '', purchase_date: new Date().toISOString().substr(0, 10),
        purchase_status: 'Diproses', payment_status: 'Unpaid', notes: '', items: [] 
    };
};

const submitEdit = async () => {
    const { valid } = await refEditForm.value!.validate();
    if (!valid) return;

    if (editForm.value.items.length === 0) {
        alert("Harap masukkan minimal satu item produk.");
        return;
    }

    isSaving.value = true;

    try {
        // Endpoint PUT ke /api/purchases/{id}
        await axios.put(`/api/purchases/${editForm.value.id}`, editForm.value);
        
        alert("Pengadaan berhasil diperbarui!");
        
        closeEditDialog();
        fetchPurchases(); // Muat ulang tabel
    } catch (error: any) {
        console.error("Gagal menyimpan:", error);
        const msg = error.response?.data?.message || error.response?.data?.error || "Terjadi kesalahan saat menyimpan.";
        alert(`Gagal menyimpan: ${msg}`);
    } finally {
        isSaving.value = false;
    }
}


// --- LIFECYCLE ---
onMounted(() => {
    getActiveBranchId();
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