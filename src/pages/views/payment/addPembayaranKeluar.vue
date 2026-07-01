<template>
  <VCard>
    <VCardTitle class="d-flex align-center pa-4">
      <VBtn icon="mdi-arrow-left" variant="text" class="mr-2" @click="goBack" />
      <span class="text-h5">Formulir Pembayaran Keluar Baru</span>
    </VCardTitle>
    <VDivider />

    <VForm ref="refForm" @submit.prevent="submitForm">
      <VCardText class="pt-6">
        <h6 class="text-h6 font-weight-bold mb-4">Detail Pengeluaran</h6>
        <VRow>
          <VCol cols="12" md="4">
            <VTextField
              v-model="form.payment_date"
              label="Tanggal Pembayaran"
              type="date"
              :rules="[requiredValidator]"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model.number="form.amount"
              label="Jumlah Keluar (Rp)"
              type="number"
              :rules="[requiredValidator, v => v > 0 || 'Jumlah harus lebih dari 0']"
              variant="outlined"
              density="compact"
              prefix="Rp"
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
        </VRow>

        <VDivider class="my-6" />

        <h6 class="text-h6 font-weight-bold mb-4">Keterangan & Sumber</h6>
        <VRow>
          <VCol cols="12" md="6">
            <VTextarea
              v-model="form.notes"
              label="Catatan / Tujuan Biaya"
              variant="outlined"
              rows="3"
              placeholder="Contoh: Bayar listrik bulan ini, Gaji Karyawan, dll."
              :rules="[requiredValidator]"
            />
          </VCol>
          <VCol cols="12" md="6">
            <!-- Opsi Pembayaran Pembelian (Hutang) -->
            <VAutocomplete
              v-model="form.purchase_id"
              :items="unpaidPurchases"
              item-title="invoice_number"
              item-value="id"
              label="Opsional: Terkait Invoice Pembelian (Hutang)"
              variant="outlined"
              density="compact"
              clearable
              :loading="loadingPurchases"
              hint="Jika pengeluaran ini untuk membayar hutang pembelian."
              persistent-hint
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
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn variant="outlined" color="secondary" class="mr-2" @click="goBack">
          Batal
        </VBtn>
        <VBtn 
          type="submit" 
          color="primary" 
          variant="flat" 
          :loading="isSaving"
        >
          Simpan Pembayaran Keluar
        </VBtn>
      </VCardActions>
    </VForm>
  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '../../../plugins/axios'
import type { VForm } from 'vuetify/components';

// --- STATE ---
const router = useRouter();
const isSaving = ref(false);
const refForm = ref<VForm>();
const branchName = ref('');
const unpaidPurchases = ref<any[]>([]);
const loadingPurchases = ref(false);

const form = ref({
  branches_id: null as number | null,
  payment_date: new Date().toISOString().substr(0, 10),
  amount: 0 as number,
  notes: '',
  purchase_id: null as number | null,
});

// --- UTILS ---
const requiredValidator = (v: any) => !!v || 'Wajib diisi';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) {
        const branch = JSON.parse(activeBranchString);
        branchName.value = branch.name;
        return branch.id;
    }
    return null;
}

const goBack = () => {
  router.back();
};

// --- FETCH DATA ---
const fetchUnpaidPurchases = async () => {
    const branchId = getActiveBranchId();
    if (!branchId) return;

    loadingPurchases.value = true;
    try {
        // Asumsi: Endpoint purchases mendukung filter untuk status 'Unpaid' atau 'Partial'
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

// --- SUBMIT ---
const submitForm = async () => {
    const { valid } = await refForm.value!.validate();
    if (!valid) return;

    const branchId = getActiveBranchId();
    if (!branchId) {
        alert("Cabang aktif tidak ditemukan.");
        return;
    }
    
    // Pastikan amount > 0 (meskipun sudah di rules, cek lagi)
    if (form.value.amount <= 0) {
        alert("Jumlah harus lebih dari 0.");
        return;
    }

    isSaving.value = true;
    
    // Siapkan payload, tambahkan branches_id
    const payload = {
        ...form.value,
        branches_id: branchId,
    };

    try {
        await axios.post('/api/payments-out', payload);
        
        alert("Pembayaran keluar berhasil dicatat!");
        
        goBack(); // Kembali ke tabel
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
    fetchUnpaidPurchases();
});
</script>