<template>
  <VDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700px"
    persistent
  >
    <VCard :loading="isProcessing">
      <!-- Tampilan Langkah 1: Data Pelanggan (Tidak Berubah) -->
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

      <!-- Tampilan Langkah 2: Pembayaran -->
      <div v-if="checkoutStep === 2">
        <VCardTitle class="d-flex align-center pa-4"><span>Pembayaran</span></VCardTitle>
        <VDivider />
        <VCardText>
          <div class="d-flex justify-space-between mb-2">
            <span class="text-medium-emphasis">Customer</span>
            <span class="font-weight-medium">{{ selectedCustomer?.name }}</span>
          </div>
          <div class="d-flex justify-space-between mb-2">
            <span class="text-medium-emphasis">Subtotal</span>
            <span class="font-weight-medium">{{ formatCurrency(cartSubtotal) }}</span>
          </div>
          <VDivider class="my-3" />

          <VRow>
            <VCol cols="12">
                <VSelect
                    v-model="selectedDiscount"
                    :items="availableDiscounts"
                    label="Pilih Diskon Tersedia"
                    item-title="name"
                    return-object
                    variant="outlined" density="compact"
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

            <VCol cols="12">
                <VSelect
                    v-model="selectedTax"
                    :items="availableTaxes"
                    label="Pilih Jenis Pajak"
                    item-title="name"
                    return-object
                    variant="outlined" density="compact"
                    clearable
                >
                    <template #item="{ props, item }">
                        <VListItem v-bind="props">
                            <VListItemTitle>{{ item.raw.name }} ({{ item.raw.rate }}%)</VListItemTitle>
                        </VListItem>
                    </template>
                </VSelect>
            </VCol>
            
            <VCol cols="12" md="6">
                <VTextField
                    :model-value="formatCurrency(calculatedDiscount)"
                    label="Potongan Diskon"
                    variant="outlined"
                    density="compact"
                    readonly
                    prefix="Rp"
                />
            </VCol>
            <VCol cols="12" md="6">
                 <VTextField
                    :model-value="formatCurrency(calculatedTax)"
                    label="Pajak Terhitung"
                    variant="outlined"
                    density="compact"
                    readonly
                    prefix="Rp"
                />
            </VCol>
          </VRow>
          
          <div class="d-flex justify-space-between text-h6 font-weight-bold my-4 pa-2 bg-grey-lighten-4 rounded">
            <span>Grand Total</span>
            <span>{{ formatCurrency(grandTotal) }}</span>
          </div>

          <VSelect v-model="paymentMethod" label="Metode Pembayaran" :items="paymentModes" item-title="name" item-value="name" variant="outlined" density="compact" class="mb-4" />
          <VTextField
            v-model.number="amountPaid"
            label="Jumlah Bayar"
            type="number"
            variant="outlined"
            density="compact"
            prefix="Rp"
            autofocus
            @keyup.enter="processPayment"
          />
          <div class="d-flex justify-space-between text-h6 font-weight-bold mt-4">
            <span>Kembalian</span>
            <span :class="changeAmount < 0 ? 'text-error' : 'text-success'">{{ formatCurrency(changeAmount) }}</span>
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
interface CartItem { id: number | string; name: string; price: number; quantity: number; is_service?: boolean; registration_id?: number; }
interface Customer { id: number; name: string; }
interface PaymentMode { id: number; name: string; }

// --- UTILITY STATE ---
const snackbar = ref({ show: false, msg: '', color: 'success', timeout: 3000 });
const showMsg = (msg: string, color = 'success') => { 
  snackbar.value = { show: true, msg, color, timeout: 3000 }; 
};

// --- PROPS & EMITS ---
const props = defineProps<{ modelValue: boolean; cart: CartItem[]; }>();
const emit = defineEmits(['update:modelValue', 'checkout-complete']);

// --- CHECKOUT STATE ---
const checkoutStep = ref(1);
const customers = ref<Customer[]>([]);
const loadingCustomers = ref(false);
const selectedCustomer = ref<Customer | null>(null);
const isProcessing = ref(false);

// --- DISKON & PAJAK STATE ---
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

// --- COMPUTED VALUES ---
const cartSubtotal = computed(() => props.cart.reduce((total, item) => total + (item.price * item.quantity), 0));

const calculatedDiscount = computed(() => {
    const d = selectedDiscount.value;
    // Jika tidak ada diskon dipilih atau subtotal kurang dari minimal bayar, diskon = 0
    if (!d || cartSubtotal.value < d.min_payment_amount) return 0;
    
    const value = parseFloat(d.discount_value);
    
    if (d.discount_type === 'percentage') {
        return Math.round(cartSubtotal.value * value);
    }
    return value;
});

// === COMPUTED PROPERTY BARU UNTUK VALIDASI TOMBOL ===
const isDiscountInvalid = computed(() => {
    const d = selectedDiscount.value;
    // Diskon tidak valid jika diskon sudah dipilih TAPI nilai diskon yang dihitung adalah nol
    // Ini terjadi jika subtotal < min_payment_amount
    return d !== null && calculatedDiscount.value === 0;
});
// ===================================================

const calculatedTax = computed(() => {
    if (!selectedTax.value) return 0;
    const rate = parseFloat(selectedTax.value.rate) / 100;
    return Math.round(cartSubtotal.value * rate);
});

const grandTotal = computed(() => (cartSubtotal.value - calculatedDiscount.value) + calculatedTax.value);
const changeAmount = computed(() => (amountPaid.value || 0) - grandTotal.value);


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
  // Isi Jumlah Bayar default dengan Grand Total
  amountPaid.value = grandTotal.value;
  checkoutStep.value = 2;
}

// --- FETCH DATA ---
const fetchAvailableDiscounts = async () => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    try {
        const { data } = await axios.get('/api/discounts', { params: { active: true, branches_id: branchId } });
        availableDiscounts.value = data.data.data || []; 
    } catch (error) {
        console.error('Gagal mengambil daftar diskon:', error);
    }
}

const fetchAvailableTaxes = async () => {
    try {
        const { data } = await axios.get('/api/taxes');
        availableTaxes.value = data.data || []; 
    } catch (error) {
        console.error('Gagal mengambil daftar pajak:', error);
    }
}

const fetchCustomers = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    customers.value = [];
    return;
  }
  loadingCustomers.value = true;
  try {
    const { data } = await axios.get('/api/customers', { params: { all: true, branches_id: branchId } });
    if (data && data.data && Array.isArray(data.data.data)) {
      customers.value = data.data.data;
    } else {
      customers.value = [];
    }
  } catch (error) {
    console.error('Gagal mengambil data pelanggan:', error);
    customers.value = [];
  } finally {
    loadingCustomers.value = false;
  }
};

const fetchPaymentModes = async () => {
  try {
    const { data } = await axios.get('/api/payment-modes');
    if (data && data.data) {
      paymentModes.value = data.data;
    }
  } catch (error) {
    console.error("Gagal mengambil metode pembayaran:", error);
    paymentModes.value = [{id: 1, name: 'Cash'}, {id: 2, name: 'QRIS'}, {id: 3, name: 'Debit'}];
  }
};

// --- PROCESS PAYMENT ---
const processPayment = async () => {
  const branchId = getActiveBranchId();
  if (!branchId || !selectedCustomer.value) {
    alert("Data tidak lengkap.");
    return;
  }
  if (amountPaid.value < grandTotal.value) {
    alert("Jumlah bayar kurang dari total.");
    return;
  }
  
  // LOGIKA PEMBLOKIRAN FRONTEND TAMBAHAN
  if (isDiscountInvalid.value) {
       alert("Diskon tidak dapat digunakan karena syarat minimum pembayaran belum terpenuhi.");
       return;
  }

  // === LOGIKA PERINGATAN DISKON/PAJAK BARU ===
  const hasCartItems = props.cart.length > 0;
  const isDiscountMissing = selectedDiscount.value === null;
  const isTaxMissing = selectedTax.value === null;
  
  if (hasCartItems && (isDiscountMissing || isTaxMissing)) {
    let warningMessage = "PERINGATAN! Transaksi ini berjalan ";

    if (isTaxMissing) {
        warningMessage += "TANPA MEMILIH PAJAK ";
    }
    if (isDiscountMissing) {
        warningMessage += (isTaxMissing ? "dan " : "") + "TANPA MEMILIH DISKON/KUPON";
    }
    
    warningMessage += "\n\nApakah Anda yakin ingin melanjutkan?";
    
    if (!window.confirm(warningMessage)) {
        return;
    }
  }
  // === AKHIR LOGIKA PERINGATAN ===

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
          id: String(item.id), 
          registration_id: item.registration_id || null, 
          is_service: !!item.is_service,
          name: item.name,
          quantity: item.quantity, 
          price: item.price 
      })),
      subtotal: cartSubtotal.value,
      total: grandTotal.value, 
      // === PERBAIKAN: TAMBAHKAN FIELD PAID_AMOUNT KE PAYLOAD ===
      paid_amount: amountPaid.value,
      // ========================================================
    };
    
    await axios.post('/api/payments', payload);

    showMsg(`Pembayaran berhasil! Kembalian: ${formatCurrency(changeAmount.value)}`, 'success');
    emit('checkout-complete');
    
    setTimeout(closeModal, 1000); 

  } catch (error: any) {
    console.error('Gagal memproses pembayaran:', error);
    const errorMessage = error.response?.data?.error || error.response?.data?.message || "Terjadi kesalahan.";
    alert(`Error: ${errorMessage}`);
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
  if (!branchId) {
    alert("Cabang aktif tidak ditemukan, gagal menyimpan pelanggan.");
    return;
  }
  const payload = { ...newCustomer.value, branches_id: branchId, };
  try {
    const { data } = await axios.post('/api/customers', payload);
    await fetchCustomers();
    selectedCustomer.value = data.data;
    closeNewCustomerDialog();
  } catch (error) { console.error('Gagal menyimpan customer baru:', error); }
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