<template>
  <VCard>
    <VCardTitle class="pa-4 bg-grey-lighten-4">
      <span class="text-h5">Tambah Registrasi</span>
    </VCardTitle>
    <VCardText class="pt-4">
      <VForm ref="refVForm" @submit.prevent="save">
        <VRow>
          <VCol cols="12" md="6">
            <!-- DIUBAH: Label dan item-value disesuaikan untuk menampilkan nama layanan -->
            <VSelect
              v-model="registrationData.registration_type"
              label="Pilih Pelayanan"
              :items="services"
              item-title="name"
              item-value="name"
              :rules="[v => !!v || 'Pelayanan wajib dipilih']"
              variant="outlined"
              density="compact"
              class="mb-4"
            />
             <VAutocomplete
              v-model="registrationData.customer_id"
              label="Customer"
              :items="customers"
              item-title="name"
              item-value="id"
              :rules="[v => !!v || 'Customer wajib dipilih']"
              variant="outlined"
              density="compact"
              class="mb-4"
              @update:modelValue="fetchPetsForCustomer"
              :loading="loadingCustomers"
            />
             <VTextField
              v-model="registrationData.registration_date"
              label="Tanggal Registrasi"
              type="date"
              :rules="[v => !!v || 'Tanggal wajib diisi']"
              variant="outlined"
              density="compact"
            />
          </VCol>

          <!-- Kolom Kanan: Pilihan Hewan Peliharaan -->
          <VCol cols="12" md="6">
            <VCard outlined>
              <VCardText>
                <div v-if="!registrationData.customer_id" class="text-center text-medium-emphasis pa-8">
                  <VIcon size="48" icon="mdi-account-search-outline" />
                  <p class="mt-4">Silakan pilih customer terlebih dahulu untuk menampilkan data hewan peliharaan.</p>
                </div>
                <div v-else-if="loadingPets" class="text-center pa-8">
                    <VProgressCircular indeterminate color="primary" class="mb-4" />
                    <div>Memuat data hewan...</div>
                </div>
                <div v-else-if="pets.length > 0">
                    <p class="font-weight-medium mb-2">Pilih Hewan:</p>
                    <VChipGroup v-model="registrationData.pet_id" column mandatory>
                        <VChip
                            v-for="pet in pets"
                            :key="pet.id"
                            :value="pet.id"
                            filter
                            color="primary"
                        >
                            {{ pet.name }} ({{ pet.pet_type.name }})
                        </VChip>
                    </VChipGroup>
                </div>
                 <div v-else class="text-center text-medium-emphasis pa-8">
                  <VIcon size="48" icon="mdi-paw-off" />
                  <p class="mt-4">Customer ini belum memiliki data hewan peliharaan.</p>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
    <VCardActions class="pa-4">
      <VSpacer />
      <VBtn color="secondary" @click="cancel" variant="text">Batal</VBtn>
      <VBtn color="primary" @click="save" variant="flat" :loading="isSaving">Simpan</VBtn>
    </VCardActions>

    <!-- === NOTIFIKASI SNACKBAR DITAMBAHKAN DI SINI === -->
    <VSnackbar
      v-model="snackbar.show"
      :timeout="snackbar.timeout"
      :color="snackbar.color"
      location="top right"
    >
      {{ snackbar.message }}
    </VSnackbar>
    <!-- === SELESAI === -->
  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '../../../plugins/axios'
import type { VForm } from 'vuetify/components';

const router = useRouter();
const refVForm = ref<VForm>();
const isSaving = ref(false);
const loadingCustomers = ref(false);
const loadingPets = ref(false);

const customers = ref<any[]>([]);
const pets = ref<any[]>([]);
const services = ref<any[]>([]);

// --- STATE UNTUK SNACKBAR ---
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 2000,
});

// --- FUNGSI HELPER UNTUK MENAMPILKAN SNACKBAR ---
const showSnackbar = (message: string, color: string = 'success') => {
  snackbar.value.message = message;
  snackbar.value.color = color;
  snackbar.value.show = true;
};

const registrationData = ref({
  registration_type: null as string | null,
  customer_id: null as number | null,
  pet_id: null as number | null,
  registration_date: new Date().toISOString().substr(0, 10), 
});

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const fetchServices = async () => {
    try {
        const { data } = await axios.get('/api/services?all=true');
        if (data && data.data) {
            services.value = data.data;
        }
    } catch (error) {
        console.error('Gagal mengambil data layanan:', error);
    }
};

const fetchCustomers = async () => {
    const branchId = getActiveBranchId();
    if (!branchId) {
        alert('Cabang aktif tidak ditemukan.');
        return;
    }
    loadingCustomers.value = true;
    try {
        const { data } = await axios.get('/api/customers', {
            params: {
                all: true,
                branches_id: branchId
            }
        });
        customers.value = data.data.data; 
    } catch (error) {
        console.error('Gagal mengambil data customer:', error);
    } finally {
        loadingCustomers.value = false;
    }
};

const fetchPetsForCustomer = async (customerId: number | null) => {
    if (!customerId) {
        pets.value = [];
        registrationData.value.pet_id = null;
        return;
    }
    loadingPets.value = true;
    try {
        const { data } = await axios.get(`/api/customers/${customerId}/pets`); 
        pets.value = data.data;
        registrationData.value.pet_id = null;
    } catch (error) {
        console.error('Gagal mengambil data hewan:', error);
    } finally {
        loadingPets.value = false;
    }
}

onMounted(() => {
  fetchCustomers();
  fetchServices();
});

const cancel = () => {
  router.back();
};

// --- FUNGSI SAVE DIPERBARUI ---
const save = async () => {
  const { valid } = await refVForm.value!.validate();
  if (!valid || !registrationData.value.pet_id) {
    if(!registrationData.value.pet_id) {
        // Ganti alert dengan snackbar error
        showSnackbar('Silakan pilih hewan peliharaan.', 'error');
    }
    return;
  }
  
  const branchId = getActiveBranchId();
  if (!branchId) {
    showSnackbar('Cabang aktif tidak ditemukan.', 'error');
    return;
  }

  isSaving.value = true;
  try {
    // 1. Kirim data ke server
    await axios.post('/api/registrations', {
        ...registrationData.value,
        status: 'Terjadwal',
        branches_id: branchId,
    });
    
    // 2. Hentikan loading dan tampilkan notifikasi sukses
    isSaving.value = false;
    showSnackbar('Registrasi berhasil dibuat!', 'success');

    // 3. Tunda navigasi agar notifikasi sempat terbaca
    setTimeout(() => {
        router.push({ name: 'registrations' }); 
        // Ganti 'registrations' dengan 'RegistrationList' jika itu nama route Anda
    }, snackbar.value.timeout - 500); // Pindah 0.5 detik sebelum snackbar hilang

  } catch (error) {
    console.error('Gagal menyimpan registrasi:', error);
    showSnackbar('Gagal menyimpan registrasi. Cek console.', 'error');
    isSaving.value = false;
  }
};
</script>
