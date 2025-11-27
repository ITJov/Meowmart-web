<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <span class="text-h5">Tabel Produk</span>
      <VSpacer />
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
        <div class="d-flex align-center py-2">
            <VAvatar size="40" class="me-3">
                <VImg :src="item.image_url || 'https://placehold.co/40x40/eeeeee/cccccc?text=N/A'" />
            </VAvatar>
            <span>{{ item.name }}</span>
        </div>
      </template>

      <template #[`item.sales_price`]="{ item }">
        {{ formatCurrency(getProductPrice(item)) }}
      </template>

      <template #[`item.purchase_price`]="{ item }">
        {{ formatCurrency(getProductPurchasePrice(item)) }}
      </template>
      
      <template #[`item.stock`]="{ item }">
        {{ getProductStock(item) }}
      </template>

      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1">
          <VBtn icon="mdi-pencil" size="small" variant="text" @click="goToEditPage(item.id)" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
        </div>
      </template>
    </VDataTableServer>
  </VCard>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'; 
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';

// State (tidak ada perubahan)
const products = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalProducts = ref(0);
const options = ref({
  page: 1,
  itemsPerPage: 10,
});
const router = useRouter();

const headers = [
  { title: 'PRODUK', key: 'product', sortable: false, width: '30%' },
  { title: 'KATEGORI', key: 'category.name', sortable: false },
  { title: 'BRAND', key: 'brand.name', sortable: false },
  { title: 'HARGA JUAL', key: 'sales_price', sortable: false },
  { title: 'HARGA BELI', key: 'purchase_price', sortable: false },
  { title: 'STOK', key: 'stock', sortable: false },
  { title: 'AKSI', key: 'actions', sortable: false, align: 'end' },
] as const; 

// DITAMBAHKAN: Helper untuk mendapatkan ID cabang aktif dari localStorage
const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) {
        return JSON.parse(activeBranchString).id;
    }
    return null;
}

// Helpers (DIPERKUAT: Penanganan jika details adalah null/undefined)
const getProductDetail = (product: any) => {
    // Memastikan product.details ada dan merupakan array sebelum mengakses [0]
    if (product.details && Array.isArray(product.details) && product.details.length > 0) {
        return product.details[0];
    }
    // Mengembalikan objek default jika detail tidak ditemukan
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

// API Call
const fetchProducts = async () => {
  // DITAMBAHKAN: Ambil ID cabang sebelum melakukan fetch
  const branchId = getActiveBranchId();
  if (!branchId) {
    console.error('Cabang aktif tidak ditemukan.'); // Ganti alert agar tidak memblokir
    products.value = []; // Kosongkan tabel jika tidak ada cabang
    totalProducts.value = 0;
    return;
  }

  loading.value = true;
  try {
    const { data } = await axios.get('/api/products', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId, // DIUBAH: Kirim ID cabang ke backend
      },
    });
    // Menambahkan logging data yang diterima
    console.log('Data Produk Diterima:', data); 
    
    if (data && data.data && Array.isArray(data.data.data)) {
        products.value = data.data.data;
        totalProducts.value = data.data.total;
    } else {
        // Jika API mengembalikan 200 OK tetapi data kosong atau struktur salah
        console.warn('Struktur data produk tidak sesuai atau kosong:', data);
        products.value = [];
        totalProducts.value = 0;
    }

  } catch (error) {
    console.error('Gagal mengambil data produk:', error);
  } finally {
    loading.value = false;
  }
};

// Actions (tidak ada perubahan)
const goToCreatePage = () => router.push({ name: 'add-products' });
const goToEditPage = (id: number) => router.push({ name: 'ProductEdit', params: { id } });

const deleteItem = async (item: any) => {
  if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
    loading.value = true;
    try {
      await axios.delete(`/api/products/${item.id}`);
      await fetchProducts();
    } catch (error) {
      console.error('Gagal menghapus produk:', error);
    } finally {
      loading.value = false;
    }
  }
};

// DIUBAH: Tambahkan listener untuk reaktivitas
onMounted(() => {
    fetchProducts();
    window.addEventListener('branch-changed', fetchProducts);
});

// DITAMBAHKAN: Hapus listener untuk best practice
onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchProducts);
});

watch(search, () => {
  options.value.page = 1;
  fetchProducts();
});
</script>
