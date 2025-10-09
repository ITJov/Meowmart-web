<template>
  <VRow>
    <!-- Kolom Kiri: Grid Produk -->
    <VCol cols="12" :md="cart.length > 0 ? 8 : 12" class="transition-swing">
      <div>
        <div class="d-flex align-center pa-1 mb-4">
          <VSpacer />
          <VSelect
            v-model="activeTab"
            :items="categoryItems"
            item-title="name"
            item-value="id"
            label="Filter Kategori"
            density="compact"
            variant="solo-filled"
            flat
            hide-details
            single-line
            class="me-4"
            style="max-width: 250px;"
            clearable
            @update:modelValue="!$event && (activeTab = 'all')"
          />
          <VTextField
            v-model="search"
            density="compact"
            label="Cari produk..."
            prepend-inner-icon="mdi-magnify"
            variant="solo-filled"
            flat
            hide-details
            single-line
          />
        </div>

        <VRow v-if="loading && products.length === 0" class="mt-4">
            <VCol v-for="n in 8" :key="n" cols="6" sm="4" md="4" lg="3">
                <VSkeletonLoader type="card" />
            </VCol>
        </VRow>
        <VRow v-else-if="!loading && products.length === 0" class="text-center pa-10">
            <VCol cols="12">
                <VIcon icon="mdi-package-variant-remove" size="80" color="grey-lighten-2" />
                <h3 class="text-h6 mt-4">Data Produk Tidak Ditemukan</h3>
                <p class="text-medium-emphasis">Coba ganti filter atau kata kunci pencarian Anda.</p>
            </VCol>
        </VRow>
        <VRow v-else>
          <VCol
            v-for="product in products"
            :key="product.id"
            cols="6" sm="4" md="4" lg="3"
          >
            <VCard class="product-card" hover elevation="2" @click="handleAddToCart(product)">
              <div class="card-visual-wrapper">
                <VImg
                  :src="product.image_url || 'https://placehold.co/400x400/eeeeee/cccccc?text=No+Image'"
                  :alt="product.name"
                  height="220"
                  cover
                />
                <VChip color="success" size="small" class="stock-chip">
                  Stok: {{ getProductStock(product) }}
                </VChip>
                <div 
                  v-if="addedProductFeedback[String(product.id)]"
                  class="added-feedback-overlay d-flex flex-column align-center justify-center"
                >
                  <VIcon icon="mdi-check-circle-outline" size="64" color="white" />
                  <span class="text-h6 font-weight-bold text-white mt-2">Ditambahkan!</span>
                </div>
              </div>
              <VCardText class="pb-2">
                <h3 class="product-name font-weight-bold mb-1">{{ product.name }}</h3>
                <div class="text-h6 font-weight-bold text-primary">
                  {{ formatCurrency(getProductPrice(product)) }}
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

      </div>
    </VCol>

    <!-- Kolom Kanan: Keranjang Belanja -->
    <VCol v-if="cart.length > 0" cols="12" md="4" class="transition-swing">
      <VCard>
        <VCardTitle class="d-flex align-center pa-4">
          <span>Order Saat Ini</span>
          <VSpacer />
          <VBtn icon="mdi-close" variant="text" size="small" @click="clearCart" />
        </VCardTitle>
        <VDivider />
        <VList lines="two" style="max-height: 400px; overflow-y: auto;">
          <VListItem
            v-for="item in cart"
            :key="String(item.id)"
            :prepend-avatar="item.image_url || 'https://placehold.co/40x40/eeeeee/cccccc?text=N/A'"
          >
            <VListItemTitle class="font-weight-bold">{{ item.name }}</VListItemTitle>
            <VListItemSubtitle>{{ formatCurrency(item.price) }}</VListItemSubtitle>

            <template #append>
              <div class="d-flex align-center">
                <VBtn icon="mdi-minus" size="x-small" variant="text" @click="updateQuantity(item.id, -1)" />
                <span class="mx-2">{{ item.quantity }}</span>
                <VBtn icon="mdi-plus" size="x-small" variant="text" @click="updateQuantity(item.id, 1)" />
              </div>
            </template>
          </VListItem>
        </VList>
        <VDivider />
        <VCardText>
          <div class="d-flex justify-space-between mb-2">
            <span>Items</span>
            <span>{{ cartTotalItems }}</span>
          </div>
          <div class="d-flex justify-space-between text-h6 font-weight-bold">
            <span>Total</span>
            <span>{{ formatCurrency(cartTotalPrice) }}</span>
          </div>
        </VCardText>
        <VCardActions class="pa-4">
          <VBtn block color="primary" variant="flat" @click="isCheckoutModalVisible = true">Next</VBtn>
        </VCardActions>
      </VCard>
    </VCol>

    <CheckoutModal
      v-model="isCheckoutModalVisible"
      :cart="cart"
      @checkout-complete="handleCheckoutComplete"
    />

    <VSnackbar
      v-model="snackbar.show"
      :timeout="snackbar.timeout"
      :color="snackbar.color"
      location="top right"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </VRow>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import axios from '@/plugins/axios';
import CheckoutModal from './checkoutModal.vue';
import { useRoute, useRouter } from 'vue-router';

// DIUBAH: Tipe 'id' sekarang bisa string atau number
interface CartItem { id: number | string; name: string; price: number; quantity: number; image_url: string | null; stock: number; is_service?: boolean; registration_id?: number; }

const products = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const activeTab = ref('all');
const categories = ref<any[]>([]);
const cart = ref<CartItem[]>([]);
const isCheckoutModalVisible = ref(false);

const router = useRouter();
const route = useRoute();

const addedProductFeedback = ref<Record<string, boolean>>({});
const snackbar = ref({ show: false, message: '', color: 'success', timeout: 2000 });

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const cartTotalItems = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0));
const cartTotalPrice = computed(() => cart.value.reduce((total, item) => total + (item.price * item.quantity), 0));

const showSnackbar = (message: string, color: string = 'success') => {
  snackbar.value.message = message;
  snackbar.value.color = color;
  snackbar.value.show = true;
};

const addToCart = (product: any, isService: boolean = false, regId?: number) => {
  const price = isService ? product.price : getProductPrice(product);
  const stock = isService ? 999 : getProductStock(product);
  const id = isService ? `service-${regId}` : product.id;

  const existingItem = cart.value.find(item => item.id === id);

  if (existingItem) {
    if (existingItem.quantity < stock) {
      existingItem.quantity++;
      showSnackbar(`Ditambahkan: ${product.name} (+1)`, 'success');
    } else {
      showSnackbar('Stok tidak mencukupi!', 'warning');
    }
  } else {
    if (stock > 0) {
      cart.value.push({
        id: id,
        name: product.name,
        price: price,
        quantity: 1,
        image_url: isService ? null : product.image_url,
        stock: stock,
        is_service: isService,
        registration_id: regId
      });
      showSnackbar(`Ditambahkan: ${product.name}`, 'success');
    } else {
      showSnackbar('Produk habis!', 'error');
    }
  }
};

const handleAddToCart = (product: any) => {
  addToCart(product);
  addedProductFeedback.value[String(product.id)] = true;
  setTimeout(() => {
    addedProductFeedback.value[String(product.id)] = false;
  }, 500);
};

const updateQuantity = (productId: number | string, amount: number) => {
  const item = cart.value.find(i => i.id === productId);
  if (!item) return;
  const newQuantity = item.quantity + amount;
  if (newQuantity <= 0) {
    cart.value = cart.value.filter(i => i.id !== productId);
    showSnackbar(`${item.name} dihapus dari keranjang.`, 'info');
  } else if (newQuantity <= item.stock) {
    item.quantity = newQuantity;
  } else {
    showSnackbar('Stok tidak mencukupi!', 'warning');
  }
};

const clearCart = () => {
  cart.value = [];
  showSnackbar('Keranjang belanja telah dikosongkan.', 'info');
};

const categoryItems = computed(() => [ { id: 'all', name: 'Semua Kategori' }, ...categories.value ]);
const getProductDetail = (product: any) => (product.details && product.details.length > 0) ? product.details[0] : { sales_price: 0, current_stock: 0 };
const getProductPrice = (product: any) => getProductDetail(product).sales_price;
const getProductStock = (product: any) => getProductDetail(product).current_stock;
const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

const fetchProducts = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;
  loading.value = true;
  try {
    const params: any = { search: search.value, per_page: 50, branches_id: branchId };
    if (activeTab.value !== 'all') params.category_id = activeTab.value;
    const { data } = await axios.get('/api/products', { params });
    products.value = data.data.data;
  } catch (error) { console.error('Gagal mengambil data produk:', error); } 
  finally { loading.value = false; }
};

const fetchCategories = async () => {
  try {
    const { data } = await axios.get('/api/categories?all=true');
    if (data && data.data) {
        categories.value = data.data.data || data.data;
    }
  } catch (error) { console.error('Gagal mengambil kategori:', error); }
};

const loadBranchData = () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    alert('Cabang aktif tidak ditemukan.');
    products.value = [];
    return;
  }
  fetchProducts();
};

const handleCheckoutComplete = () => {
    const registrationIdsToUpdate = cart.value
        .filter(item => item.is_service && item.registration_id)
        .map(item => item.registration_id);

    if (registrationIdsToUpdate.length > 0) {
        registrationIdsToUpdate.forEach(id => {
            axios.patch(`/api/registrations/${id}/status`, { status: 'Selesai' });
        });
    }
    clearCart();
}

// productView.vue

const fetchAndAddRegistrationsToCart = async (encodedIds: string) => {
  try {
    const { data } = await axios.get('/api/registrations/details', {
      params: { ids: encodedIds }
    });

    if (data && data.data && data.data.length > 0) {
      data.data.forEach((reg: any) => {
        if (reg.service) {
          addToCart(reg.service, true, reg.id);
        }
      });
      showSnackbar(`${data.data.length} layanan berhasil ditambahkan ke keranjang.`, 'success');

      await nextTick();

      router.replace({ query: {} });
    }
  } catch (error) {
    console.error("Gagal mengambil detail registrasi:", error);
    router.replace({ query: {} });
  } 
};

onMounted(() => {
  if (route.query.registrations && typeof route.query.registrations === 'string') {
    fetchAndAddRegistrationsToCart(route.query.registrations);
  }
  fetchCategories();
  loadBranchData();
  window.addEventListener('branch-changed', loadBranchData);
});

onUnmounted(() => {
  window.removeEventListener('branch-changed', loadBranchData);
});

// DIUBAH: Watcher sekarang memiliki 'immediate: true' dan menggantikan logika di onMounted
// watch(() => route.query.registrations, (newRegistrations) => {
//     if (newRegistrations && typeof newRegistrations === 'string') {
//         fetchAndAddRegistrationsToCart(newRegistrations);
//     }
// }, { immediate: true });

let searchTimeout: number;
watch([search, activeTab], () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchProducts(), 500);
});

</script>

<style scoped>
.product-card { 
  transition: all 0.2s ease-in-out; 
  border-radius: 12px; 
  overflow: hidden; 
  cursor: pointer; 
  position: relative;
}
.product-card:hover { 
  transform: translateY(-4px); 
  box-shadow: 0 8px 25px rgba(0,0,0,0.1); 
}
.card-visual-wrapper { position: relative; }
.stock-chip { position: absolute; top: 12px; right: 12px; z-index: 2; }
.product-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.added-feedback-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 1;
  opacity: 0;
  animation: fadeInOut 0.5s forwards;
  pointer-events: none;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
</style>

