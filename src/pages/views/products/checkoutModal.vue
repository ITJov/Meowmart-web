<template>
  <VDialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700px"
    persistent
  >
    <VCard :loading="isProcessing">
      <!-- Tampilan Langkah 1: Data Pelanggan -->
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

      <!-- Tampilan Langkah 2: Pembayaran (dengan Fitur Kasir Lengkap) -->
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
            <VCol cols="6">
              <VTextField
                v-model.number="discount"
                label="Diskon"
                type="number"
                variant="outlined"
                density="compact"
                prefix="Rp"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model.number="tax"
                label="Pajak"
                type="number"
                variant="outlined"
                density="compact"
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
          <VBtn color="success" variant="flat" @click="processPayment" :loading="isProcessing" :disabled="amountPaid < grandTotal">Proses Pembayaran</VBtn>
        </VCardActions>
      </div>
    </VCard>

    <!-- Dialog untuk Menambah Customer Baru -->
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

// DIUBAH: Tipe 'id' sekarang bisa string atau number agar sesuai dengan POS.vue
interface CartItem { id: number | string; name: string; price: number; quantity: number; is_service?: boolean; registration_id?: number; }
interface Customer { id: number; name: string; }
interface PaymentMode { id: number; name: string; }

const props = defineProps<{ modelValue: boolean; cart: CartItem[]; }>();
const emit = defineEmits(['update:modelValue', 'checkout-complete']);

const checkoutStep = ref(1);
const customers = ref<Customer[]>([]);
const loadingCustomers = ref(false);
const selectedCustomer = ref<Customer | null>(null);
const isProcessing = ref(false);

const discount = ref(0);
const tax = ref(0);
const amountPaid = ref(0);
const paymentMethod = ref('Cash');
const paymentModes = ref<PaymentMode[]>([]);

const isCustomerDialogVisible = ref(false);
const refNewCustomerForm = ref<VForm>();
const newCustomer = ref({ name: '', email: '', phone: '', address: '', password: '' });
const defaultNewCustomer = { ...newCustomer.value };

const cartSubtotal = computed(() => props.cart.reduce((total, item) => total + (item.price * item.quantity), 0));
const grandTotal = computed(() => (cartSubtotal.value - (discount.value || 0)) + (tax.value || 0));
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
    discount.value = 0;
    tax.value = 0;
    amountPaid.value = 0;
  }, 300);
};

const goToStepTwo = () => {
  amountPaid.value = grandTotal.value;
  checkoutStep.value = 2;
}

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

  isProcessing.value = true;
  try {
    const payload = {
      branches_id: branchId,
      customer_id: selectedCustomer.value.id,
      payment_method: paymentMethod.value,
      // DIUBAH: Payload cart sekarang lebih pintar
      cart: props.cart.map(item => ({ 
          id: item.is_service ? null : item.id, // ID Produk (null jika layanan)
          registration_id: item.registration_id || null, // ID Registrasi (hanya untuk layanan)
          is_service: !!item.is_service,
          name: item.name,
          quantity: item.quantity, 
          price: item.price 
      })),
      subtotal: cartSubtotal.value,
      total_discount: discount.value,
      total_tax: tax.value,
      total: grandTotal.value,
    };
    
    await axios.post('/api/payments', payload);

    alert(`Pembayaran berhasil! Kembalian: ${formatCurrency(changeAmount.value)}`);
    emit('checkout-complete');
    closeModal();

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

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    fetchCustomers();
    fetchPaymentModes();
    checkoutStep.value = 1;
  }
});
</script>

