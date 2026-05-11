<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Produk</span>
      <VSpacer />

      <VSelect
        v-model="statusFilter"
        :items="[
          { title: 'Semua Status', value: 'all' },
          { title: 'Aktif', value: 'active' },
          { title: 'Nonaktif', value: 'inactive' }
        ]"
        label="Filter Status"
        density="compact"
        variant="solo-filled"
        flat
        hide-details
        class="me-4"
        style="max-width: 180px;"
      />

      <VTextField
        v-model="search"
        density="compact"
        label="Pencarian"
        prepend-inner-icon="mdi-magnify"
        variant="solo-filled"
        flat
        hide-details
        single-line
        class="me-4"
        style="max-width: 250px;"
      />
      
      <VBtn color="primary" @click="goToCreatePage">
        <VIcon icon="mdi-plus" start />
        Tambah Produk Baru
      </VBtn>
    </VCardTitle>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="products"
      :items-length="totalProducts"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchProducts"
    >
      <template #[`item.product`]="{ item }">
        <div class="d-flex align-center py-2" :class="{ 'opacity-50': !item.is_active }">
            <VAvatar size="40" class="me-3" rounded="sm" color="grey-lighten-4">
                <VImg :src="item.image_url || 'https://placehold.co/40x40/eeeeee/cccccc?text=N/A'" cover />
            </VAvatar>
            <div class="d-flex flex-column">
                <div class="d-flex align-center">
                  <span :class="{ 'text-grey text-decoration-line-through': !item.is_active }" class="font-weight-medium">
                      {{ item.name }}
                  </span>
                  <VChip v-if="!item.is_active" size="x-small" color="error" class="ms-2" variant="flat">
                    Inactive
                  </VChip>
                </div>
                <span class="text-caption text-medium-emphasis">{{ item.item_code || '-' }}</span>
            </div>
        </div>
      </template>

      <template #[`item.sales_price`]="{ item }">
        <span class="text-primary font-weight-bold">{{ formatCurrency(getProductPrice(item)) }}</span>
      </template>

      <template #[`item.purchase_price`]="{ item }">
        {{ formatCurrency(getProductPurchasePrice(item)) }}
      </template>
      
      <template #[`item.stock`]="{ item }">
        <VChip size="small" :color="getProductStock(item) > 0 ? 'success' : 'error'" variant="tonal">
            {{ getProductStock(item) }}
        </VChip>
      </template>

      <template #[`item.status_expired`]="{ item }">
        <VChip
          size="x-small"
          :color="getExpiryColor(item)"
          variant="flat"
          class="font-weight-bold"
        >
          {{ getExpiryText(item) }}
        </VChip>
      </template>

      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1 justify-end">
          
          <VTooltip location="top" text="Lihat Detail Batch (FEFO)">
            <template #activator="{ props }">
               <VBtn 
                 icon="mdi-eye-circle" 
                 size="small" 
                 variant="text" 
                 color="info" 
                 v-bind="props" 
                 @click="goToDetailPage(item.id)" 
               />
            </template>
          </VTooltip>

          <VTooltip location="top" text="Update Stok (Restock)">
            <template #activator="{ props }">
              <VBtn 
                icon="mdi-plus-box" 
                size="small" 
                variant="text" 
                color="success" 
                v-bind="props" 
                @click="openStockDialog(item)" 
                :disabled="!item.is_active" 
              />
            </template>
          </VTooltip>

          <VTooltip location="top" text="Edit Produk">
            <template #activator="{ props }">
               <VBtn icon="mdi-pencil" size="small" variant="text" v-bind="props" @click="goToEditPage(item.id)" />
            </template>
          </VTooltip>
          
          <VTooltip location="top" :text="item.is_active ? 'Nonaktifkan Produk' : 'Aktifkan Produk'">
            <template #activator="{ props }">
              <VBtn 
                :icon="item.is_active ? 'mdi-archive-arrow-down' : 'mdi-archive-arrow-up'" 
                size="small" 
                variant="text" 
                :color="item.is_active ? 'warning' : 'success'" 
                v-bind="props" 
                @click="toggleProductStatus(item)" 
              />
            </template>
          </VTooltip>
        </div>
      </template>
    </VDataTableServer>

    <VDialog v-model="stockDialog.show" max-width="400px">
      <VCard>
        <VCardTitle class="pa-4 bg-success text-white">
          <VIcon icon="mdi-plus-box" class="me-2" /> Update Stok Produk
        </VCardTitle>
        <VCardText class="pt-4">
          <div class="mb-4">
            <div class="text-subtitle-1 font-weight-bold">{{ stockDialog.productName }}</div>
            <div class="text-caption">Stok Saat Ini: <strong>{{ stockDialog.currentStock }}</strong></div>
          </div>
          
          <VTextField
            v-model.number="stockDialog.addQty"
            label="Jumlah Stok Masuk"
            type="number"
            variant="outlined"
            density="compact"
            suffix="item"
            autofocus
            hide-details
            class="mb-4"
          />

          <VTextField
            v-model="stockDialog.expiryDate"
            label="Tanggal Kadaluwarsa (ED)"
            type="date"
            variant="outlined"
            density="compact"
            placeholder="Pilih tanggal jika ada"
          />
          <p class="text-caption text-grey mt-1">* Stok baru akan ditambahkan sebagai batch terpisah</p>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="stockDialog.show = false">Batal</VBtn>
          <VBtn 
            color="success" 
            variant="flat" 
            :loading="stockDialog.loading"
            @click="updateStock"
          >
            Simpan Stok
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VCard>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'; 
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';

// --- State ---
const products = ref<any[]>([]);
const search = ref('');
const statusFilter = ref('all'); // State untuk filter status
const loading = ref(true);
const totalProducts = ref(0);
const options = ref({
  page: 1,
  itemsPerPage: 10,
});
const router = useRouter();

// State Dialog Update Stok
const stockDialog = ref({
  show: false,
  loading: false,
  productId: null as number | null,
  productName: '',
  currentStock: 0,
  addQty: 1,
  expiryDate: '', 
});

// --- Konfigurasi Header Tabel ---
const headers = [
  { title: 'PRODUK', key: 'product', sortable: false, width: '30%' },
  { title: 'KATEGORI', key: 'category.name', sortable: false },
  { title: 'BRAND', key: 'brand.name', sortable: false },
  { title: 'HARGA JUAL', key: 'sales_price', sortable: false },
  { title: 'HARGA BELI', key: 'purchase_price', sortable: false },
  { title: 'STOK', key: 'stock', sortable: false },
  { title: 'STATUS ED', key: 'status_expired', sortable: false },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const; 

// --- Helper Functions ---

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) {
        try {
            return JSON.parse(activeBranchString).id;
        } catch (e) { return null; }
    }
    return null;
}

const getProductDetail = (product: any) => {
    if (product.details && Array.isArray(product.details) && product.details.length > 0) {
        return product.details[0];
    }
    return { sales_price: 0, purchase_price: 0, current_stock: 0 };
}
const getProductPrice = (product: any) => getProductDetail(product).sales_price;
const getProductPurchasePrice = (product: any) => getProductDetail(product).purchase_price;
const getProductStock = (product: any) => getProductDetail(product).current_stock;

const formatCurrency = (value: number) => {
  if (value === null || value === undefined) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(value)
}

const getNearestBatch = (product: any) => {
    if (product.batches && product.batches.length > 0) {
        return product.batches[0]; 
    }
    return null;
};

const getExpiryColor = (product: any) => {
    const batch = getNearestBatch(product);
    if (!batch) return 'grey-lighten-2';
    const today = new Date();
    const expDate = new Date(batch.expiry_date);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'error';
    if (diffDays < 30) return 'warning';
    return 'success';
};

const getExpiryText = (product: any) => {
    const batch = getNearestBatch(product);
    if (!batch) return '-';
    const today = new Date();
    const expDate = new Date(batch.expiry_date);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `Exp (${Math.abs(diffDays)} hari lalu)`;
    if (diffDays === 0) return 'Expired Hari Ini';
    if (diffDays < 30) return `${diffDays} Hari Lagi`;
    return 'Aman';
};

// --- API & Navigation Actions ---

const fetchProducts = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;

  loading.value = true;
  try {
    const { data } = await axios.get('/api/products', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId,
        only_active: statusFilter.value === 'all' ? null : (statusFilter.value === 'active' ? true : false)
      },
    });
    
    if (data && data.data && Array.isArray(data.data.data)) {
        products.value = data.data.data;
        totalProducts.value = data.data.total;
    }
  } catch (error) {
    console.error('Gagal mengambil data produk:', error);
  } finally {
    loading.value = false;
  }
};

const goToDetailPage = (id: number) => {
  router.push({ name: 'ProductDetail', params: { id } });
};

const openStockDialog = (item: any) => {
  stockDialog.value = {
    show: true,
    loading: false,
    productId: item.id,
    productName: item.name,
    currentStock: getProductStock(item),
    addQty: 1,
    expiryDate: '', 
  };
};

const updateStock = async () => {
  if (stockDialog.value.addQty <= 0) {
    alert("Jumlah stok harus lebih dari 0");
    return;
  }
  const branchId = getActiveBranchId();
  stockDialog.value.loading = true;
  try {
    await axios.post(`/api/products/${stockDialog.value.productId}/update-stock`, {
      branches_id: branchId,
      quantity: stockDialog.value.addQty,
      expiry_date: stockDialog.value.expiryDate, 
    });
    fetchProducts();
    stockDialog.value.show = false;
  } catch (error: any) {
    alert("Gagal memperbarui stok: " + (error.response?.data?.message || "Terjadi kesalahan"));
  } finally {
    stockDialog.value.loading = false;
  }
};

const toggleProductStatus = async (item: any) => {
  const actionText = item.is_active ? 'menonaktifkan' : 'mengaktifkan';
  
  if (!confirm(`Apakah Anda yakin ingin ${actionText} produk "${item.name}"?`)) return;

  try {
    const response = await axios.patch(`/api/products/${item.id}/toggle-active`);
    
    if (response.data.success) {
      // Perbaikan Reaktivitas: Update status lokal
      item.is_active = !item.is_active; 
      alert(response.data.message);
      
      // Jika sedang memfilter (hanya aktif/hanya nonaktif), refresh tabel agar item yang berubah status berpindah/menghilang
      if (statusFilter.value !== 'all') {
        fetchProducts();
      }
    }
  } catch (error: any) {
    console.error("Gagal mengubah status:", error);
    alert("Gagal memproses permintaan status.");
  }
};

const goToCreatePage = () => router.push({ name: 'add-products' });
const goToEditPage = (id: number) => router.push({ name: 'ProductEdit', params: { id } });

// --- Lifecycle & Watchers ---

onMounted(() => {
    fetchProducts();
    window.addEventListener('branch-changed', fetchProducts);
});

onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchProducts);
});

// Watcher untuk pencarian
let searchTimeout: any;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
      options.value.page = 1;
      fetchProducts();
  }, 500);
});

// Watcher untuk filter status
watch(statusFilter, () => {
  options.value.page = 1;
  fetchProducts();
});
</script>