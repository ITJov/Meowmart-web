<template>
  <VCard>
    <VCardTitle class="pa-4 bg-grey-lighten-4">
      <span class="text-h5">Tambah Pengadaan Baru</span>
    </VCardTitle>
    <VCardText class="pt-4">
      <VForm ref="refVForm" @submit.prevent="savePurchase">
        <!-- Bagian Informasi Utama (Tidak Berubah) -->
        <VRow>
          <VCol cols="12" md="4">
            <VTextField
              v-model="purchaseData.supplier"
              label="Nama Supplier"
              :rules="[v => !!v || 'Supplier wajib diisi']"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model="purchaseData.purchase_date"
              label="Tanggal Pengadaan"
              type="date"
              :rules="[v => !!v || 'Tanggal wajib diisi']"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="4">
             <VSelect
              v-model="purchaseData.purchase_status"
              label="Status Pengadaan"
              :items="['Selesai', 'Dipesan', 'Dikirim']"
              :rules="[v => !!v || 'Status wajib dipilih']"
              variant="outlined"
              density="compact"
            />
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <!-- Bagian Tambah Item Produk dengan Dropdown Bertingkat -->
        <h3 class="text-h6 mb-4">Item Produk</h3>
        <VRow>
          <!-- Filter Dropdown -->
          <VCol cols="12" md="4">
            <VSelect
              v-model="selectedCategory"
              :items="categories"
              item-title="name"
              item-value="id"
              label="1. Pilih Kategori"
              variant="outlined"
              density="compact"
              clearable
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              v-model="selectedBrand"
              :items="brands"
              item-title="name"
              item-value="id"
              label="2. Pilih Brand"
              variant="outlined"
              density="compact"
              clearable
            />
          </VCol>
        </VRow>
        <VRow align="end">
          <VCol cols="12" md="5">
             <VSelect
              v-model="newItem.product"
              :items="products"
              item-title="name"
              item-value="id"
              label="3. Pilih Produk"
              variant="outlined"
              density="compact"
              return-object
              :loading="isSearching"
              :disabled="!selectedCategory || !selectedBrand"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="2">
            <VTextField
              v-model.number="newItem.quantity"
              label="Jumlah"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VTextField
              v-model.number="newItem.unit_price"
              label="Harga Beli Satuan"
              type="number"
              prefix="Rp"
              variant="outlined"
              density="compact"
              hide-details
            />
          </VCol>
          <VCol cols="12" md="2">
            <VBtn color="primary" @click="addItem" block :disabled="!newItem.product">Tambah Item</VBtn>
          </VCol>
        </VRow>

        <!-- Tabel Item yang Ditambahkan (Tidak Berubah) -->
        <VDataTable
          :headers="itemHeaders"
          :items="purchaseData.items"
          class="mt-6 border rounded"
          no-data-text="Belum ada item yang ditambahkan"
        >
          <template #[`item.unit_price`]="{ item }">
            {{ formatCurrency(item.unit_price) }}
          </template>
          <template #[`item.subtotal`]="{ item }">
            {{ formatCurrency(item.quantity * item.unit_price) }}
          </template>
          <template #[`item.actions`]="{ index }">
            <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="removeItem(index)" />
          </template>
        </VDataTable>

        <!-- Rincian Total (Tidak Berubah) -->
        <VRow justify="end" class="mt-4">
          <VCol md="4">
            <div class="d-flex justify-space-between text-h6 font-weight-bold pa-2 bg-grey-lighten-4 rounded">
              <span>Total:</span>
              <span>{{ formatCurrency(totalAmount) }}</span>
            </div>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
    <VCardActions class="pa-4">
      <VSpacer />
      <VBtn color="secondary" @click="cancel" variant="text">Batal</VBtn>
      <VBtn color="primary" @click="savePurchase" variant="flat" :loading="isSaving">Simpan Pengadaan</VBtn>
    </VCardActions>
  </VCard>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';
import type { VForm } from 'vuetify/components';

const router = useRouter();
const refVForm = ref<VForm>();
const isSaving = ref(false);
const isSearching = ref(false);

const purchaseData = ref({
  supplier: '',
  purchase_date: new Date().toISOString().substr(0, 10),
  purchase_status: 'Selesai',
  payment_status: 'Paid',
  notes: '',
  items: [] as any[],
});

// State untuk dropdown filter
const categories = ref([]);
const brands = ref([]);
const products = ref([]);
// DIUBAH: Tipe disesuaikan untuk menerima undefined dari 'clearable'
const selectedCategory = ref<number | null | undefined>(null);
const selectedBrand = ref<number | null | undefined>(null);

const newItem = ref({
    product: null as any | null,
    quantity: 1,
    unit_price: 0,
});

const totalAmount = computed(() => purchaseData.value.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0));

const itemHeaders = [
    { title: 'Produk', key: 'name' },
    { title: 'Jumlah', key: 'quantity' },
    { title: 'Harga Satuan', key: 'unit_price' },
    { title: 'Subtotal', key: 'subtotal' },
    { title: 'Aksi', key: 'actions', sortable: false, align: 'end' },
] as const;

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const fetchInitialDropdowns = async () => {
    try {
        const [catRes, brandRes] = await Promise.all([
            axios.get('/api/categories?all=true'),
            axios.get('/api/brands?all=true'),
        ]);
        
        if (catRes.data && catRes.data.data) {
            categories.value = catRes.data.data.data || catRes.data.data;
        }

        if (brandRes.data && brandRes.data) {
            brands.value = brandRes.data.data.data || brandRes.data.data;
        }

    } catch (error) {
        console.error("Gagal mengambil data dropdown awal:", error);
    }
}

const fetchProductsForDropdown = async () => {
    if (!selectedCategory.value || !selectedBrand.value) {
        products.value = [];
        return;
    }
    isSearching.value = true;
    try {
        const branchId = getActiveBranchId();
        const { data } = await axios.get('/api/products', {
            params: {
                all_products: true, 
                branches_id: branchId,
                category_id: selectedCategory.value,
                brand_id: selectedBrand.value,
            }
        });
        if(data && data.data) {
          products.value = Array.isArray(data.data) ? data.data : data.data.data;
        }
    } catch (error) {
        console.error("Gagal mengambil daftar produk:", error);
    } finally {
        isSearching.value = false;
    }
}

watch([selectedCategory, selectedBrand], () => {
    newItem.value.product = null; // Reset pilihan produk
    fetchProductsForDropdown();
});

onMounted(fetchInitialDropdowns);

const addItem = () => {
    if (!newItem.value.product || newItem.value.quantity <= 0) return;
    purchaseData.value.items.push({
        product_id: newItem.value.product.id,
        name: newItem.value.product.name,
        quantity: newItem.value.quantity,
        unit_price: newItem.value.unit_price,
    });
    newItem.value = { product: null, quantity: 1, unit_price: 0 };
    products.value = [];
    selectedCategory.value = undefined;
    selectedBrand.value = undefined;
}

const removeItem = (index: number) => {
    purchaseData.value.items.splice(index, 1);
}

const cancel = () => {
  router.back();
};

const savePurchase = async () => {
  const { valid } = await refVForm.value!.validate();
  if (!valid || purchaseData.value.items.length === 0) {
      if(purchaseData.value.items.length === 0) alert("Silakan tambahkan minimal satu item produk.");
      return;
  }

  const branchId = getActiveBranchId();
  if (!branchId) {
      alert("Cabang aktif tidak ditemukan.");
      return;
  }

  isSaving.value = true;
  try {
    const payload = {
      ...purchaseData.value,
      branches_id: branchId,
    };
    await axios.post('/api/purchases', payload);
    router.push({ name: 'purchases' });
  } catch (error) {
    console.error('Gagal menyimpan pengadaan:', error);
  } finally {
    isSaving.value = false;
  }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

</script>

