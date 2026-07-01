<template>
  <VCard :loading="isSaving">
    <VCardTitle class="pa-4 bg-grey-lighten-4">
      <span class="text-h5">{{ isEditMode ? 'Edit Diskon' : 'Tambah Diskon Baru' }}</span>
    </VCardTitle>
    <VCardText class="pt-4">
      <VForm ref="refVForm" @submit.prevent="save">
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="editedItem.name"
              label="Nama Diskon"
              :rules="[v => !!v || 'Nama wajib diisi']"
              variant="outlined" density="compact"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="editedItem.code"
              label="Kode Kupon (Opsional)"
              placeholder="Misal: NATAL2025"
              variant="outlined" density="compact"
            />
          </VCol>
          
          <VCol cols="12" md="6">
            <VSelect
              v-model="editedItem.discount_type"
              label="Tipe Diskon"
              :items="[{name: 'Persentase (%)', value: 'percentage'}, {name: 'Potongan Harga (Rp)', value: 'fixed'}]"
              item-title="name" item-value="value"
              :rules="[v => !!v || 'Tipe wajib dipilih']"
              variant="outlined" density="compact"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model.number="editedItem.discount_value"
              :label="editedItem.discount_type === 'percentage' ? 'Nilai Diskon (%)' : 'Nilai Potongan (Rp)'"
              type="number"
              :prefix="editedItem.discount_type === 'percentage' ? '%' : 'Rp'"
              :rules="discountValueRules"
              variant="outlined" density="compact"
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="editedItem.start_date"
              label="Tanggal Mulai Berlaku"
              type="date"
              :rules="[v => !!v || 'Tanggal mulai wajib diisi']"
              variant="outlined" density="compact"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="editedItem.end_date"
              label="Tanggal Kadaluarsa (Opsional)"
              type="date"
              :rules="endDateRules"
              variant="outlined" density="compact"
            />
          </VCol>

          <VCol cols="12">
            <VTextField
              v-model.number="editedItem.min_payment_amount"
              label="Syarat Pembayaran Minimal (Rp)"
              type="number"
              prefix="Rp"
              variant="outlined" density="compact"
            />
          </VCol>

          <VCol cols="12">
            <VTextarea
              v-model="editedItem.description"
              label="Deskripsi / Syarat dan Ketentuan (SnK)"
              variant="outlined" density="compact" rows="2"
            />
          </VCol>

          <VCol cols="12" md="4">
             <VSwitch
                v-model="editedItem.is_active"
                :label="editedItem.is_active ? 'Status: Aktif' : 'Status: Non-Aktif'"
                color="success"
             />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model.number="editedItem.usage_limit"
              label="Batas Total Penggunaan"
              type="number"
              placeholder="Kosongkan jika tidak terbatas"
              variant="outlined" density="compact"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model.number="editedItem.user_limit"
              label="Batas Penggunaan per User"
              type="number"
              variant="outlined" density="compact"
            />
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
    <VCardActions class="pa-4 bg-white border-t">
      <VSpacer />
      <VBtn color="secondary" variant="text" @click="$emit('close')">Batal</VBtn>
      <VBtn color="primary" variant="flat" @click="save" :loading="isSaving">Simpan Diskon</VBtn>
    </VCardActions>
  </VCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from '../../../plugins/axios'
import type { VForm } from 'vuetify/components';

// Tambahkan di atas <script setup>

interface DiscountItem {
    id?: number; // Opsional karena tidak ada saat Tambah Baru
    name: string;
    code: string | null;
    description: string | null;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_payment_amount: number;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    usage_limit: number | null;
    user_limit: number;
}

// Ganti bagian props:
const props = defineProps<{
    initialData: DiscountItem; // Menggunakan interface yang baru dibuat
    isEditMode: boolean;
}>();

const emit = defineEmits(['saved', 'close']);

const refVForm = ref<VForm>();
const isSaving = ref(false);

const editedItem = ref({ ...props.initialData });

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    return activeBranchString ? JSON.parse(activeBranchString).id : null;
}

// Validation Rules
// Ganti seluruh computed discountValueRules dan endDateRules

const discountValueRules = computed(() => {
    // Rule Dasar: Wajib diisi dan > 0
    const rules: ((v: number) => true | string)[] = [
        (v: number) => v !== null && v !== undefined && v > 0 || 'Nilai harus lebih besar dari 0'
    ];
    
    // Rule Tambahan untuk Persentase
    if (editedItem.value.discount_type === 'percentage') {
        rules.push((v: number) => v <= 100 || 'Persentase maksimal 100%');
    }
    return rules;
});

const endDateRules = computed(() => {
    const rules: ((v: string | null) => true | string)[] = [];
    
    // Rule: Tanggal kadaluarsa harus setelah tanggal mulai
    if (editedItem.value.end_date && editedItem.value.start_date) {
        rules.push((v: string | null) => 
            (v !== null && v >= editedItem.value.start_date) || 'Tanggal kadaluarsa harus setelah tanggal mulai'
        );
    }
    return rules;
});

const save = async () => {
    const { valid } = await refVForm.value!.validate();
    if (!valid) return;
    
    isSaving.value = true;
    const branchId = getActiveBranchId();
    if (!branchId) { 
        alert('Cabang aktif tidak ditemukan.'); 
        isSaving.value = false;
        return;
    }
    
    const payload: any = { ...editedItem.value, branches_id: branchId };
    
    if (!payload.end_date) { 
        delete payload.end_date; 
    }
    
    
    if (!props.isEditMode && payload.id) {
         delete payload.id;
    }
    
    try {
        if (props.isEditMode && payload.id) {
            await axios.put(`/api/discounts/${payload.id}`, payload);
        } else if (!props.isEditMode) {
            await axios.post('/api/discounts', payload);
        } else {
             throw new Error('ID diskon tidak ditemukan untuk mode edit.');
        }
        
        emit('saved');
        emit('close');
    } catch (error: any) {
        console.error('Gagal menyimpan diskon:', error);
        alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
        isSaving.value = false;
    }
}
</script>