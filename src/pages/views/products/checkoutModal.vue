<template>
  <VDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700px"
    persistent
  >
    <VCard :loading="isProcessing">
      <div v-if="checkoutStep === 1">
        <VCardTitle class="d-flex align-center pa-4">
          <span>Data Pelanggan</span>
          <VSpacer />
          <VBtn icon="mdi-close" variant="text" size="small" @click="closeModal" />
        </VCardTitle>
        <VDivider />
        <VCardText class="pt-6">
          <div class="d-flex align-start">
            <VAutocomplete
              v-model="selectedCustomer"
              :items="customers"
              item-title="name"
              item-value="id"
              label="Cari Nama Pengguna / Baru"
              variant="outlined"
              density="compact"
              return-object
              autofocus
              :loading="loadingCustomers"
            />
            <VBtn icon="mdi-plus" color="primary" class="ml-2" @click="openNewCustomerDialog" />
          </div>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VBtn variant="text" @click="closeModal">Batal</VBtn>
          <VSpacer />
          <VBtn color="primary" variant="flat" :disabled="!selectedCustomer" @click="goToStepTwo">Next</VBtn>
        </VCardActions>
      </div>

      <div v-if="checkoutStep === 2">
        <VCardTitle class="d-flex align-center pa-4">
          <span>Pembayaran</span>
          <VSpacer />
          <VBtn icon="mdi-close" variant="text" size="small" @click="closeModal" />
        </VCardTitle>
        <VDivider />
        <VCardText>
          <div class="d-flex justify-space-between mb-2">
            <span class="text-medium-emphasis">Customer</span>
            <span class="font-weight-medium">{{ selectedCustomer?.name }}</span>
          </div>

          <div class="d-flex justify-space-between text-h6 font-weight-bold my-4 pa-3 bg-primary-lighten-5 rounded border-dashed">
            <span>Grand Total (Inc. Tax)</span>
            <span>{{ formatCurrency(grandTotal) }}</span>
          </div>

          <VRow>
            <VCol cols="12">
                <VSelect
                    v-model="selectedDiscount"
                    :items="availableDiscounts"
                    label="Gunakan Diskon/Kupon"
                    item-title="name"
                    return-object
                    variant="outlined" 
                    density="compact"
                    clearable
                >
                    <template #item="{ props, item }">
                        <VListItem 
                            v-bind="props" 
                            :subtitle="`Min. Bayar: ${formatCurrency(item.raw.min_payment_amount)}`"
                        >
                            <VListItemTitle>
                                {{ item.raw.name }} ({{ item.raw.discount_type === 'percentage' ? (item.raw.discount_value * 100) + '%' : formatCurrency(item.raw.discount_value) }})
                            </VListItemTitle>
                        </VListItem>
                    </template>
                </VSelect>
                <div v-if="isDiscountInvalid" class="text-error text-caption">
                    Minimal pembayaran belum terpenuhi untuk diskon ini.
                </div>
            </VCol>

            <VCol cols="12" md="6">
                <VTextField
                    :model-value="formatCurrency(calculatedDiscount)"
                    label="Potongan Diskon"
                    variant="filled"
                    density="compact"
                    readonly
                    prefix="Rp"
                    color="error"
                />
            </VCol>
            
            <VCol cols="12" md="6">
                 <VTextField
                    :model-value="formatCurrency(calculatedTax)"
                    label="PPN Terkandung (11%)"
                    variant="filled"
                    density="compact"
                    readonly
                    prefix="Rp"
                    messages="Pajak sudah otomatis termasuk dalam harga"
                />
            </VCol>
          </VRow>
          
          <VDivider class="my-4" />

          <VSelect 
            v-model="paymentMethod" 
            label="Metode Pembayaran" 
            :items="paymentModes" 
            item-title="name" 
            item-value="name" 
            variant="outlined" 
            density="compact" 
            class="mb-4" 
          />
          
          <VTextField
            v-model.number="amountPaid"
            label="Jumlah Bayar"
            type="number"
            variant="outlined"
            density="compact"
            prefix="Rp"
            class="text-h6"
            autofocus
            @keyup.enter="processPayment"
          />

          <div class="d-flex justify-space-between text-h6 font-weight-bold mt-4">
            <span>Kembalian</span>
            <span :class="changeAmount < 0 ? 'text-error' : 'text-success'">
              {{ formatCurrency(changeAmount) }}
            </span>
          </div>

        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VBtn variant="text" @click="checkoutStep = 1">Previous</VBtn>
          <VSpacer />
          <VBtn 
            color="success" 
            variant="flat" 
            @click="processPayment" 
            :loading="isProcessing" 
            :disabled="amountPaid < grandTotal || isDiscountInvalid"
          >
            Proses Pembayaran
          </VBtn>
        </VCardActions>
      </div>
    </VCard>

    <VDialog v-model="isCustomerDialogVisible" max-width="600px" persistent>
      <VCard>
        <VCardTitle class="pa-4"><span class="text-h5">Tambah Pelanggan Baru</span></VCardTitle>
        <VCardText>
          <VForm ref="refNewCustomerForm">
            <VContainer>
              <VRow>
                <VCol cols="12"><VTextField v-model="newCustomer.name" label="Nama Pelanggan" :rules="[v => !!v || 'Nama wajib diisi']" /></VCol>
                <VCol cols="12" md="6"><VTextField v-model="newCustomer.email" label="Email" :rules="[v => !!v || 'Email wajib diisi']" /></VCol>
                <VCol cols="12" md="6"><VTextField v-model="newCustomer.phone" label="Nomor HP" :rules="[v => !!v || 'Nomor HP wajib diisi']" /></VCol>
                <VCol cols="12"><VTextarea v-model="newCustomer.address" label="Alamat" /></VCol>
                <VCol cols="12"><VTextField v-model="newCustomer.password" label="Password" type="password" :rules="[v => !!v || 'Password wajib diisi']" /></VCol>
              </VRow>
            </VContainer>
          </VForm>
        </VCardText>
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn color="secondary" @click="closeNewCustomerDialog">Batal</VBtn>
          <VBtn color="primary" @click="saveNewCustomer">Simpan</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import axios from '@/plugins/axios';
import type { VForm } from 'vuetify/components';

// --- INTERFACE ---
interface CartItem { id: number | string; name: string; price: number; quantity: number; is_service?: boolean; registration_id?: number;unique_item_id?: number | null; }
interface Customer { id: number; name: string; }
interface PaymentMode { id: number; name: string; }

// --- PROPS & EMITS ---
const props = defineProps<{ modelValue: boolean; cart: CartItem[]; }>();
const emit = defineEmits(['update:modelValue', 'checkout-complete']);

// --- CONSTANTS ---
const DEFAULT_TAX_NAME = 'PPN'; // Nama pajak yang akan otomatis dipilih

// --- STATE ---
const checkoutStep = ref(1);
const customers = ref<Customer[]>([]);
const loadingCustomers = ref(false);
const selectedCustomer = ref<Customer | null>(null);
const isProcessing = ref(false);

const availableDiscounts = ref<any[]>([]); 
const selectedDiscount = ref<any>(null); 
const availableTaxes = ref<any[]>([]); 
const selectedTax = ref<any>(null); 

const amountPaid = ref(0);
const paymentMethod = ref('Cash');
const paymentModes = ref<PaymentMode[]>([]);

const isCustomerDialogVisible = ref(false);
const refNewCustomerForm = ref<VForm>();
const newCustomer = ref({ name: '', email: '', phone: '', address: '', password: '' });
const defaultNewCustomer = { ...newCustomer.value };

// --- PERHITUNGAN (LOGIKA INKLUSIF) ---

// 1. Subtotal dari keranjang
const cartSubtotal = computed(() => props.cart.reduce((total, item) => total + (item.price * item.quantity), 0));

// 2. Potongan Diskon (Dihitung dari subtotal inklusif)
const calculatedDiscount = computed(() => {
    const d = selectedDiscount.value;
    if (!d || cartSubtotal.value < d.min_payment_amount) return 0;
    
    const value = parseFloat(d.discount_value);
    if (d.discount_type === 'percentage') {
        return Math.round(cartSubtotal.value * value);
    }
    return value;
});

// Validasi minimal bayar untuk diskon
const isDiscountInvalid = computed(() => {
    const d = selectedDiscount.value;
    return d !== null && cartSubtotal.value < d.min_payment_amount;
});

// 3. Pajak Inklusif (Rumus: Harga - (Harga / (1 + Rate)))
// 
const calculatedTax = computed(() => {
    if (!selectedTax.value) return 0;
    const rate = parseFloat(selectedTax.value.rate) / 100;
    // Menghitung porsi pajak yang sudah ada di dalam harga
    return Math.round(cartSubtotal.value - (cartSubtotal.value / (1 + rate)));
});

// 4. Grand Total (Harga sudah termasuk pajak, hanya dikurangi diskon)
const grandTotal = computed(() => cartSubtotal.value - calculatedDiscount.value);

// 5. Kembalian
const changeAmount = computed(() => (amountPaid.value || 0) - grandTotal.value);

// --- METHODS ---

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const closeModal = () => {
  emit('update:modelValue', false);
  setTimeout(() => {
    checkoutStep.value = 1;
    selectedCustomer.value = null;
    selectedDiscount.value = null; 
    selectedTax.value = null;
    amountPaid.value = 0;
  }, 300);
};

const goToStepTwo = () => {
  amountPaid.value = grandTotal.value;
  checkoutStep.value = 2;
}

// --- FETCH DATA ---

const fetchAvailableTaxes = async () => {
    try {
        const { data } = await axios.get('/api/taxes');
        availableTaxes.value = data.data || []; 
        
        // OTOMATIS PILIH PPN jika tersedia
        if (availableTaxes.value.length > 0) {
            const autoTax = availableTaxes.value.find(t => t.name.includes(DEFAULT_TAX_NAME));
            selectedTax.value = autoTax || availableTaxes.value[0];
        }
    } catch (error) {
        console.error('Gagal mengambil daftar pajak:', error);
    }
}

const fetchAvailableDiscounts = async () => {
    const branchId = getActiveBranchId();
    if (!branchId) return;
    try {
        const { data } = await axios.get('/api/discounts', { params: { active: true, branches_id: branchId } });
        availableDiscounts.value = data.data.data || []; 
    } catch (error) { console.error(error); }
}

const fetchCustomers = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) return;
  loadingCustomers.value = true;
  try {
    const { data } = await axios.get('/api/customers', { params: { all: true, branches_id: branchId } });
    customers.value = data.data.data || [];
  } catch (error) { console.error(error); } finally { loadingCustomers.value = false; }
};

const fetchPaymentModes = async () => {
  try {
    const { data } = await axios.get('/api/payment-modes');
    paymentModes.value = data.data || [];
  } catch (error) { console.error(error); }
};

// --- PROCESS PAYMENT ---

const processPayment = async () => {
  const branchId = getActiveBranchId();
  if (!branchId || !selectedCustomer.value) return;
  
  if (amountPaid.value < grandTotal.value) {
    alert("Jumlah bayar kurang.");
    return;
  }

  isProcessing.value = true;
  try {
    const payload = {
      branches_id: branchId,
      customer_id: selectedCustomer.value.id,
      payment_method: paymentMethod.value,
      
      discount_id: selectedDiscount.value?.id || null, 
      total_discount: calculatedDiscount.value, 
      tax_id: selectedTax.value?.id || null, 
      total_tax: calculatedTax.value, 
      
      cart: props.cart.map(item => ({ 
          id: item.is_service ? item.registration_id : item.id, 
          registration_id: item.registration_id || null, 
          unique_item_id: item.unique_item_id || null, 
          is_service: !!item.is_service,
          name: item.name,
          quantity: item.quantity, 
          price: item.price 
      })),
      subtotal: cartSubtotal.value,
      total: grandTotal.value, 
      paid_amount: amountPaid.value,
      tax_type: 'inclusive' // Memberi tahu backend bahwa pajak sudah inklusif
    };
    
    await axios.post('/api/payments', payload);
    emit('checkout-complete');
    setTimeout(closeModal, 500); 

  } catch (error: any) {
    console.error(error);
    alert("Gagal memproses pembayaran.");
  } finally {
    isProcessing.value = false;
  }
};

const openNewCustomerDialog = () => { newCustomer.value = { ...defaultNewCustomer }; isCustomerDialogVisible.value = true; };
const closeNewCustomerDialog = () => { isCustomerDialogVisible.value = false; };
const saveNewCustomer = async () => {
  const { valid } = await refNewCustomerForm.value!.validate();
  if (!valid) return;
  const branchId = getActiveBranchId();
  try {
    const { data } = await axios.post('/api/customers', { ...newCustomer.value, branches_id: branchId });
    await fetchCustomers();
    selectedCustomer.value = data.data;
    closeNewCustomerDialog();
  } catch (error) { console.error(error); }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    fetchCustomers();
    fetchPaymentModes();
    fetchAvailableDiscounts();
    fetchAvailableTaxes(); 
    checkoutStep.value = 1;
  }
});
</script>