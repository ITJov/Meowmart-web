<template>
  <div class="fill-height bg-grey-lighten-5 pa-3">
    <VRow class="match-height">
      
      <VCol cols="12" md="4" lg="4" class="d-flex flex-column h-100">
        <VCard class="flex-grow-1 d-flex flex-column" elevation="2">
          <VCardTitle class="d-flex align-center py-3 px-4 bg-primary text-white border-b">
            <VIcon icon="mdi-account-plus" start />
            <span class="text-h6 font-weight-bold">Registrasi Walk-in</span>
          </VCardTitle>

          <div class="flex-grow-1 overflow-y-auto pa-4">
            <VForm ref="regFormRef" @submit.prevent="submitRegistration">
              
              <div class="mb-4">
                <label class="text-caption font-weight-bold text-medium-emphasis mb-1 d-block">Layanan</label>
                <VSelect
                  v-model="formData.service"
                  :items="serviceList"
                  item-title="name"
                  item-value="id"
                  return-object
                  placeholder="Pilih Jasa / Layanan"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Layanan wajib dipilih']"
                  prepend-inner-icon="mdi-stethoscope"
                  @update:modelValue="handleServiceChange"
                >
                  <template #item="{ props, item }">
                    <VListItem v-bind="props" :subtitle="formatCurrency(item.raw.price)" />
                  </template>
                </VSelect>
              </div>

              <div class="mb-4">
                <label class="text-caption font-weight-bold text-medium-emphasis mb-1 d-block">Pelanggan</label>
                <VAutocomplete
                  v-model="formData.customer_id"
                  :items="customerList"
                  item-title="display_name_phone" 
                  item-value="id"
                  placeholder="Cari Nama / No. Telepon Customer..."
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Customer wajib dipilih']"
                  prepend-inner-icon="mdi-account-search"
                  @update:modelValue="fetchPetsForCustomer"
                  :loading="loadingCustomers"
                  no-data-text="Data tidak ditemukan"
                  clearable
                />
              </div>

              <div class="mb-4 bg-grey-lighten-4 pa-3 rounded border" style="min-height: 120px;">
                <label class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">Hewan Peliharaan</label>
                
                <div v-if="loadingPets" class="text-center py-4">
                   <VProgressCircular indeterminate color="primary" size="24" />
                </div>

                <div v-else-if="!formData.customer_id" class="text-center py-4 text-caption text-grey">
                   <VIcon icon="mdi-arrow-up" class="mb-1" />
                   <div>Pilih customer di atas</div>
                </div>

                <div v-else-if="petList.length > 0">
                   <VRadioGroup v-model="formData.pet_id" color="primary" :rules="[v => !!v || 'Pilih hewan']">
                      <VRadio 
                        v-for="pet in petList" 
                        :key="pet.id" 
                        :value="pet.id"
                        class="mb-1"
                      >
                        <template #label>
                          <span class="text-body-2 font-weight-medium text-high-emphasis">
                            {{ pet.name }} 
                            <span class="text-caption text-grey">({{ pet.pet_type?.name || 'N/A' }})</span>
                          </span>
                        </template>
                      </VRadio>
                   </VRadioGroup>
                </div>

                <div v-else class="text-center py-4 text-error text-caption">
                   <VIcon icon="mdi-paw-off" color="error" />
                   <div>Customer ini tidak memiliki data hewan.</div>
                </div>
              </div>

              <VExpandTransition>
                <VRow v-if="isHotelServiceSelected" class="mb-4">
                    <VCol cols="12" md="6" class="py-0">
                        <label class="text-caption font-weight-bold text-medium-emphasis mb-1 d-block">Check-in Date</label>
                        <VTextField
                            v-model="formData.start_date"
                            type="date"
                            variant="outlined"
                            density="compact"
                            :rules="[v => !!v || 'Check-in wajib diisi']"
                            hide-details="auto"
                            class="mb-2"
                            @update:modelValue="fetchAvailableKandangs"
                        />
                    </VCol>
                    <VCol cols="12" md="6" class="py-0">
                        <label class="text-caption font-weight-bold text-medium-emphasis mb-1 d-block">Check-out Date</label>
                        <VTextField
                            v-model="formData.end_date"
                            type="date"
                            variant="outlined"
                            density="compact"
                            :rules="endDateRules"
                            hide-details="auto"
                            class="mb-2"
                            @update:modelValue="fetchAvailableKandangs"
                        />
                    </VCol>

                    <VCol cols="12" class="py-0 mt-1">
                         <label class="text-caption font-weight-bold text-medium-emphasis mb-1 d-block">Pilih Kandang</label>
                        <VSelect
                            v-model="formData.kandang_id"
                            :items="availableKandangs"
                            item-title="name" 
                            item-value="id"
                            placeholder="Pilih Kandang Tersedia..."
                            variant="outlined"
                            density="compact"
                            :rules="[v => !!v || 'Kandang wajib dipilih']"
                            :loading="loadingKandangs"
                            no-data-text="Tidak ada kandang tersedia"
                        />
                    </VCol>
                </VRow>
              </VExpandTransition>
              
              <div class="mb-6">
                <label class="text-caption font-weight-bold text-medium-emphasis mb-1 d-block">Tanggal Order</label>
                <VTextField
                  v-model="formData.registration_date"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </div>

              <VBtn 
                block 
                color="primary" 
                size="large" 
                type="submit" 
                :loading="isSubmittingReg"
                elevation="2"
                class="mt-auto"
              >
                Proses & Masuk Keranjang
                <VIcon end icon="mdi-arrow-right" />
              </VBtn>

            </VForm>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="8" lg="8" class="d-flex flex-column h-100">
        <VCard class="flex-grow-1 d-flex flex-column flex-md-row overflow-hidden position-relative" elevation="2">
          
          <div 
            class="d-flex flex-column transition-all"
            :style="{ width: (isCartVisible && $vuetify.display.mdAndUp) ? '65%' : '100%' }"
          >
            <div class="d-flex align-center pa-3 gap-2 bg-white border-b">
              <VSelect
                v-model="prodActiveCategory"
                :items="categories"
                item-title="name" item-value="id"
                placeholder="Kategori"
                density="compact" variant="outlined"
                hide-details style="max-width: 150px;"
                bg-color="grey-lighten-5"
              />
              <VTextField
                v-model="prodSearch"
                density="compact" placeholder="Scan Barcode / Cari Produk..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined" hide-details
                bg-color="grey-lighten-5"
                clearable
              />
              <VBtn 
                v-if="!isCartVisible && cart.length > 0"
                icon="mdi-cart" color="primary" variant="flat" 
                @click="isCartVisible = true"
              >
                <VBadge :content="cartTotalItems" color="error"><VIcon icon="mdi-cart" /></VBadge>
              </VBtn>
            </div>

            <div class="flex-grow-1 overflow-y-auto pa-3 bg-grey-lighten-5">
              <div v-if="prodLoading" class="d-flex justify-center py-10">
                <VProgressCircular indeterminate color="primary" />
              </div>
              
              <div v-else-if="products.length === 0" class="d-flex flex-column align-center justify-center h-100 text-grey">
                 <VIcon icon="mdi-package-variant" size="64" class="mb-2 opacity-50"/>
                 <span>Produk tidak ditemukan di cabang ini</span>
              </div>

              <VRow v-else>
                <VCol 
                  v-for="product in products" :key="product.id" 
                  cols="6" :md="isCartVisible ? 4 : 3" :lg="isCartVisible ? 4 : 3" :xl="isCartVisible ? 3 : 2"
                >
                  <VCard 
                    @click="addProductToCart(product)" 
                    class="product-card h-100 d-flex flex-column"
                    hover border flat
                  >
                    <div class="img-container bg-white position-relative">
                       <VImg :src="product.image_url || 'https://placehold.co/200x200/f5f5f5/cccccc?text=No+Img'" height="120" cover />
                       <VChip 
                        size="x-small" 
                        class="stock-chip font-weight-bold" 
                        :color="getProductStock(product) > 0 ? 'success' : 'error'"
                        variant="flat"
                       >
                        Stok: {{ getProductStock(product) }}
                      </VChip>
                    </div>
                    <div class="pa-2 d-flex flex-column flex-grow-1">
                      <div class="text-caption font-weight-bold mb-1 text-truncate-2" style="min-height: 32px;">
                        {{ product.name }}
                      </div>
                      <VSpacer />
                      <div class="text-primary font-weight-bold">{{ formatCurrency(getProductPrice(product)) }}</div>
                    </div>
                  </VCard>
                </VCol>
              </VRow>
            </div>
          </div>

          <div 
            v-if="isCartVisible"
            class="d-flex flex-column border-s bg-white transition-slide cart-container" 
          >
            <div class="pa-3 border-b d-flex align-center bg-grey-lighten-4">
              <VIcon icon="mdi-cart-outline" color="primary" class="me-2" />
              <span class="text-subtitle-1 font-weight-bold">Keranjang Belanja</span>
              <VSpacer />
              <VBtn icon="mdi-close" variant="text" size="small" color="grey" @click="isCartVisible = false" />
            </div>

            <div class="flex-grow-1 overflow-y-auto pa-2">
              <div v-if="cart.length === 0" class="text-center py-10 text-grey">
                <VIcon icon="mdi-basket-remove-outline" size="50" class="mb-2 opacity-50" />
                <p class="text-caption">Keranjang kosong</p>
              </div>

              <VList v-else lines="two" density="compact" class="cart-list">
                <VListItem 
                  v-for="item in cart" :key="item.id" 
                  class="mb-2 rounded border bg-grey-lighten-5 pa-2"
                >
                  <template #prepend>
                    <VAvatar rounded size="40" :color="item.is_service ? 'purple-lighten-5' : 'white'" class="border">
                      <VIcon v-if="item.is_service" icon="mdi-doctor" color="purple" size="24" />
                      <VImg v-else :src="item.image_url || 'https://placehold.co/50'" cover />
                    </VAvatar>
                  </template>

                  <VListItemTitle class="font-weight-bold text-caption mb-1 text-truncate">
                    {{ item.name }}
                  </VListItemTitle>
                  <VListItemSubtitle class="d-flex justify-space-between align-center">
                    <span class="text-primary font-weight-bold text-caption">
                      {{ formatCurrency(item.price * item.quantity) }}
                    </span>
                  </VListItemSubtitle>

                  <div class="d-flex align-center mt-2 justify-end gap-2">
                    <template v-if="!item.is_service">
                        <VBtn icon="mdi-minus" size="x-small" variant="tonal" density="compact" @click="updateQty(item.id, -1)" />
                        <span class="text-caption font-weight-medium px-2">{{ item.quantity }}</span>
                        <VBtn icon="mdi-plus" size="x-small" variant="tonal" density="compact" color="primary" @click="updateQty(item.id, 1)" />
                    </template>
                    <template v-else>
                        <VChip size="x-small" color="purple" variant="flat" label>Jasa</VChip>
                    </template>
                    <VBtn icon="mdi-trash-can-outline" size="x-small" variant="text" color="error" @click="removeFromCart(item.id)" />
                  </div>
                </VListItem>
              </VList>
            </div>

            <div class="pa-3 border-t bg-grey-lighten-4">
              <div class="d-flex justify-space-between text-caption mb-1">
                <span>Total Item</span>
                <span>{{ cartTotalItems }}</span>
              </div>
              <div class="d-flex justify-space-between align-center mb-3">
                <span class="text-h6 font-weight-bold">Total Bayar</span>
                <span class="text-h6 font-weight-bold text-primary">{{ formatCurrency(cartTotalPrice) }}</span>
              </div>
              <div class="d-flex gap-2">
                  <VBtn color="error" variant="tonal" icon="mdi-delete" @click="clearCart" :disabled="cart.length === 0" />
                  <VBtn class="flex-grow-1" color="primary" size="large" :disabled="cart.length === 0" @click="isCheckoutVisible = true" elevation="2">
                    BAYAR SEKARANG
                  </VBtn>
              </div>
            </div>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <CheckoutModal 
      v-model="isCheckoutVisible" 
      :cart="cart" 
      @checkout-complete="handleCheckoutComplete" 
    />
    
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="top" timeout="3000">
        {{ snackbar.msg }}
    </VSnackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import axios from '@/plugins/axios'; // Pastikan path axios benar
import CheckoutModal from './checkoutModal.vue'; // Asumsi file modal ada di folder yang sama
import type { VForm } from 'vuetify/components';

// --- CONFIG & UTILS ---
const getActiveBranchId = () => {
  // Mengambil ID cabang aktif dari LocalStorage (diset saat login)
  const activeBranchString = localStorage.getItem('activeBranch');
  if (activeBranchString) {
      try {
          return JSON.parse(activeBranchString).id;
      } catch (e) { return null; }
  }
  return null;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const snackbar = ref({ show: false, msg: '', color: 'success' });
const showMsg = (msg: string, color = 'success') => { snackbar.value = { show: true, msg, color }; };

// --- STATE LAYOUT ---
const isCartVisible = ref(false); 
const isCheckoutVisible = ref(false);

// --- STATE FORM REGISTRASI (KIRI) ---
const regFormRef = ref<VForm>();
const isSubmittingReg = ref(false);
const loadingCustomers = ref(false);
const loadingPets = ref(false);
const loadingKandangs = ref(false);

const serviceList = ref<any[]>([]);
const customerList = ref<any[]>([]);
const petList = ref<any[]>([]);
const availableKandangs = ref<any[]>([]);

const formData = ref({
    service: null as any, 
    customer_id: null as number | null,
    pet_id: null as number | null,
    registration_date: new Date().toISOString().substr(0, 10), 
    start_date: new Date().toISOString().substr(0, 10),
    end_date: null as string | null,
    kandang_id: null as number | null,
});

// --- COMPUTED & RULES ---
const isHotelServiceSelected = computed(() => {
    return formData.value.service?.name?.toLowerCase().includes('hotel') ?? false;
});

const endDateRules = computed(() => {
    const rules: ((v: any) => true | string)[] = [
            (v: any) => !!v || 'Check-out wajib diisi'
    ];
    if (formData.value.start_date) {
        rules.push((v: string) => v > formData.value.start_date || 'Harus setelah Check-in');
    }
    return rules;
});

// --- STATE POS (KANAN) ---
const products = ref<any[]>([]);
const categories = ref([{ id: 'all', name: 'Semua' }]);
const prodLoading = ref(false);
const prodSearch = ref('');
const prodActiveCategory = ref('all');
let searchTimeout: any;

// --- STATE CART ---
const cart = ref<any[]>([]);
const cartTotalItems = computed(() => cart.value.reduce((acc, item) => acc + item.quantity, 0));
const cartTotalPrice = computed(() => cart.value.reduce((acc, item) => acc + (item.price * item.quantity), 0));

// ================= METHODS API =================

// 1. Load Data Produk (Dengan filter Cabang)
const fetchProducts = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
      showMsg('Cabang tidak terdeteksi. Silakan login ulang.', 'error');
      return;
  }
  
  prodLoading.value = true;
  try {
    // PENTING: Parameter branches_id dikirim agar backend memfilter stok yang sesuai
    const params: any = { 
        search: prodSearch.value, 
        per_page: 20, 
        branches_id: branchId 
    };
    
    if (prodActiveCategory.value !== 'all') params.category_id = prodActiveCategory.value;
    
    const { data } = await axios.get('/api/products', { params });
    // Asumsi response Laravel: { data: { data: [...] } }
    products.value = data.data.data;
  } catch (e) { 
      console.error(e); 
      showMsg('Gagal memuat produk', 'error');
  } finally { 
      prodLoading.value = false; 
  }
};

const fetchCategories = async () => {
  try {
    const { data } = await axios.get('/api/categories?all=true');
    categories.value = [{id: 'all', name: 'Semua'}, ...data.data.data];
  } catch (e) {}
};

const fetchServices = async () => {
    try {
        const { data } = await axios.get('/api/services?all=true');
        if (data && data.data) { serviceList.value = data.data; }
    } catch (error) { console.error('Gagal ambil layanan', error); }
};

const fetchCustomers = async () => {
    const branchId = getActiveBranchId();
    if (!branchId) return;
    loadingCustomers.value = true;
    try {
        const { data } = await axios.get('/api/customers', {
            params: { all: true, branches_id: branchId }
        });
        
        const rawCustomers = data.data.data || [];
        customerList.value = rawCustomers.map((c: any) => ({
            ...c,
            display_name_phone: `${c.name} (${c.phone || 'No HP'})` 
        }));

    } catch (error) { console.error('Gagal ambil customer', error); } 
    finally { loadingCustomers.value = false; }
};

const fetchPetsForCustomer = async (customerId: number | null) => {
    if (!customerId) {
        petList.value = [];
        formData.value.pet_id = null;
        return;
    }
    loadingPets.value = true;
    try {
        const { data } = await axios.get(`/api/customers/${customerId}/pets`); 
        petList.value = data.data;
        formData.value.pet_id = null; 
    } catch (error) { console.error('Gagal ambil hewan', error); } 
    finally { loadingPets.value = false; }
}

const fetchActiveKandangs = async () => { // <--- PERUBAHAN NAMA FUNGSI
    formData.value.kandang_id = null; 
    availableKandangs.value = []; 
    const branchId = getActiveBranchId();
    
    if (!isHotelServiceSelected.value || !branchId) {
        return;
    }
    
    loadingKandangs.value = true;
    try {
        const { data } = await axios.get('/api/kandangs/active-list', { 
            params: { branches_id: branchId }
        });
        
        availableKandangs.value = data.data || []; 
        
    } catch (e) {
        console.error('Gagal ambil daftar kandang:', e);
    } finally {
        loadingKandangs.value = false;
    }
}

const fetchAvailableKandangs = async () => {
    formData.value.kandang_id = null; 
    availableKandangs.value = []; 
    const branchId = getActiveBranchId();
    
    if (!isHotelServiceSelected.value || !branchId || !formData.value.start_date || !formData.value.end_date) {
        return;
    }

    if (formData.value.start_date >= formData.value.end_date) return;
    
    loadingKandangs.value = true;
    try {
        const { data } = await axios.get('/api/kandangs/availability', {
            params: {
                branches_id: branchId,
                start_date: formData.value.start_date,
                end_date: formData.value.end_date,
            }
        });
        
        availableKandangs.value = data.data || [];
        if (availableKandangs.value.length === 0) {
             showMsg('Tidak ada kandang tersedia untuk tanggal ini.', 'warning');
        }
        
    } catch (e) {
        console.error('Gagal cek kandang:', e);
    } finally {
        loadingKandangs.value = false;
    }
}

const handleServiceChange = () => {
    formData.value.end_date = null;
    formData.value.kandang_id = null;
    if (isHotelServiceSelected.value) {
        fetchActiveKandangs(); 
    } else {
        availableKandangs.value = [];
    }
}

// 2. LOGIC SUBMIT REGISTRASI
const submitRegistration = async () => {
    const { valid } = await regFormRef.value!.validate();
    if (!valid) return;

    const selectedService = formData.value.service; 
    const branchId = getActiveBranchId();

    if (!branchId) { showMsg('Cabang tidak valid', 'error'); return; }

    isSubmittingReg.value = true;
    try {
        if (isHotelServiceSelected.value && !formData.value.kandang_id) { 
            showMsg('Kandang wajib dipilih.', 'warning'); 
            isSubmittingReg.value = false; 
            return; 
        }

        const payload: any = {
            registration_type: selectedService.name, 
            service_id: selectedService.id,
            customer_id: formData.value.customer_id,
            pet_id: formData.value.pet_id,
            registration_date: formData.value.registration_date,
            status: 'Terjadwal',
            branches_id: branchId
        };
        
        if (isHotelServiceSelected.value) {
            payload.start_date = formData.value.start_date;
            payload.end_date = formData.value.end_date;
            payload.kandang_id = formData.value.kandang_id;
        }

        // Kirim ke Backend
        const { data: regData } = await axios.post('/api/registrations', payload);
        const newReg = regData.data; 

        // Buat item untuk Cart
        const customer = customerList.value.find(c => c.id === formData.value.customer_id);
        let cartItemName = `Jasa: ${selectedService.name} (${customer?.name || 'Client'})`;
        
        let finalPrice = selectedService.price;
        let qty = 1;

        // Jika Hotel, hitung durasi hari
        if (isHotelServiceSelected.value) {
             const days = Math.ceil((new Date(formData.value.end_date!).getTime() - new Date(formData.value.start_date!).getTime()) / (1000 * 3600 * 24));
             cartItemName += ` - ${days} Hari`;
             finalPrice = selectedService.price * days; // Harga total jasa hotel
        }

        const cartItem = {
            id: `service-${newReg.id}`,
            name: cartItemName,
            price: finalPrice,
            quantity: qty,
            image_url: null,
            is_service: true,
            registration_id: newReg.id
        };
        
        cart.value.push(cartItem);
        isCartVisible.value = true; 
        showMsg('Registrasi berhasil! Layanan ditambahkan ke keranjang.', 'success');

        // Reset Form
        resetForm();

    } catch (e: any) { 
        console.error(e);
        const errorMsg = e.response?.data?.message || 'Gagal memproses registrasi';
        showMsg(errorMsg, 'error'); 
    } finally { 
        isSubmittingReg.value = false; 
    }
}

const resetForm = () => {
    formData.value = { 
        service: null, customer_id: null, pet_id: null, 
        registration_date: new Date().toISOString().substr(0, 10),
        start_date: new Date().toISOString().substr(0, 10),
        end_date: null, kandang_id: null
    };
    petList.value = [];
    availableKandangs.value = [];
    regFormRef.value?.resetValidation();
}

// 3. LOGIC CART & PRODUCT HELPER
// Mengambil stok dari array details (sesuai perbaikan backend sebelumnya)
const getProductStock = (p: any) => {
    if (p.details && p.details.length > 0) {
        return p.details[0].current_stock;
    }
    return 0;
};

const getProductPrice = (p: any) => {
    if (p.details && p.details.length > 0) {
        return p.details[0].sales_price;
    }
    return 0;
};

const addProductToCart = (product: any) => {
  const stock = getProductStock(product);
  if (stock <= 0) { showMsg('Stok Habis di cabang ini!', 'error'); return; }
  
  const price = getProductPrice(product);
  
  // Cari item di cart
  const existing = cart.value.find(i => i.id === product.id && !i.is_service);
  
  if (existing) {
    if (existing.quantity < stock) existing.quantity++;
    else showMsg(`Stok hanya tersedia ${stock}`, 'warning');
  } else {
    cart.value.push({
      id: product.id, 
      name: product.name,
      price: price, 
      quantity: 1,
      image_url: product.image_url, 
      stock: stock, 
      is_service: false
    });
  }
  isCartVisible.value = true;
};

const updateQty = (id: any, amount: number) => {
  const idx = cart.value.findIndex(i => i.id === id);
  if (idx === -1) return;
  const item = cart.value[idx];
  
  // Jangan ubah qty jika itu jasa/layanan (biasanya fixed 1 per reg)
  if (item.is_service) return;

  const newQty = item.quantity + amount;

  if (newQty <= 0) {
      cart.value.splice(idx, 1);
      if(cart.value.length === 0) isCartVisible.value = false;
  } else {
      if (newQty > item.stock) { showMsg(`Stok maksimum ${item.stock}`, 'warning'); return; }
      item.quantity = newQty;
  }
};

const removeFromCart = (id: any) => {
  cart.value = cart.value.filter(i => i.id !== id);
  if(cart.value.length === 0) isCartVisible.value = false;
};

const clearCart = () => { cart.value = []; isCartVisible.value = false; };

const handleCheckoutComplete = () => {
  clearCart();
  isCheckoutVisible.value = false;
  showMsg('Transaksi Pembayaran Berhasil', 'success');
  // Refresh data produk untuk update stok terbaru
  fetchProducts();
};

// 4. LIFECYCLE
onMounted(() => {
  fetchCategories(); 
  fetchProducts(); 
  fetchServices(); 
  fetchCustomers();
  
  // Listener custom jika ada mekanisme ganti cabang global
  window.addEventListener('branch-changed', () => { 
      fetchProducts(); 
      fetchCustomers(); 
      cart.value = []; // Kosongkan cart saat ganti cabang
  });
});

onUnmounted(() => window.removeEventListener('branch-changed', () => {}));

// Watcher untuk pencarian produk
watch([prodSearch, prodActiveCategory], () => { 
    clearTimeout(searchTimeout); 
    searchTimeout = setTimeout(fetchProducts, 500); 
});
</script>

<style scoped>
/* Mengatur tinggi agar pas satu layar tanpa scroll window */
.fill-height { height: calc(100vh - 64px); overflow: hidden; }
.match-height { height: 100%; }
.v-col { height: 100%; } 
.v-card { height: 100%; } 

/* Animasi dan Gaya Kartu */
.transition-all { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.stock-chip { position: absolute; top: 8px; right: 8px; z-index: 2; }
.product-card { cursor: pointer; transition: transform 0.2s; overflow: hidden; }
.product-card:hover { transform: translateY(-4px); border-color: var(--v-theme-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

/* Scrollbar Custom */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
::-webkit-scrollbar-track { background: transparent; }

/* Responsive Cart */
.cart-container { width: 100%; }
@media (min-width: 960px) { 
    .cart-container { width: 35%; min-width: 320px; max-width: 400px; }
}
</style>