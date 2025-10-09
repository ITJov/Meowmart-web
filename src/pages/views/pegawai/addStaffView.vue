<template>
  <VCard>
    <VCardTitle class="pa-4 bg-grey-lighten-4">
      <span class="text-h5">Tambah Pegawai Baru</span>
    </VCardTitle>
    <VCardText class="pt-4">
      <VForm ref="refVForm" @submit.prevent="save">
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="staffData.name"
              label="Nama Pegawai"
              :rules="[v => !!v || 'Nama wajib diisi']"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="staffData.email"
              label="Email"
              type="email"
              :rules="[v => !!v || 'Email wajib diisi']"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="staffData.phone"
              label="Nomor HP"
              variant="outlined"
              density="compact"
            />
          </VCol>
           <VCol cols="12" md="6">
            <VTextField
              v-model="staffData.password"
              label="Password"
              type="password"
              :rules="[v => !!v || 'Password wajib diisi']"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12">
            <VTextarea
              v-model="staffData.address"
              label="Alamat"
              rows="3"
              variant="outlined"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="staffData.role_id"
              :items="roles"
              item-title="name"
              item-value="id"
              label="Peran (Role)"
              :rules="[v => !!v || 'Peran wajib dipilih']"
              variant="outlined"
              density="compact"
            />
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
    <VCardActions class="pa-4">
      <VSpacer />
      <VBtn color="secondary" @click="cancel" variant="text">Batal</VBtn>
      <VBtn color="primary" @click="save" variant="flat" :loading="isSaving">Simpan Pegawai</VBtn>
    </VCardActions>
  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';
import type { VForm } from 'vuetify/components';

const router = useRouter();
const refVForm = ref<VForm>();
const isSaving = ref(false);

// State untuk data form
const staffData = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  role_id: null,
  // branches_id dihapus dari sini karena akan ditambahkan secara otomatis
});

const roles = ref([]);

// DITAMBAHKAN: Helper untuk mendapatkan ID cabang aktif
const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const fetchDropdownData = async () => {
  try {
    // Hanya perlu mengambil data roles sekarang
    const rolesResponse = await axios.get('/api/roles');
    if (rolesResponse.data && rolesResponse.data.data) {
      roles.value = rolesResponse.data.data;
    }
  } catch (error) {
    console.error('Gagal mengambil data untuk form:', error);
  }
};

onMounted(() => {
  fetchDropdownData();
});

const cancel = () => {
  router.back();
};

const save = async () => {
  const { valid } = await refVForm.value!.validate();
  if (!valid) return;

  // DIUBAH: Dapatkan ID cabang aktif sebelum mengirim data
  const branchId = getActiveBranchId();
  if (!branchId) {
    alert("Cabang aktif tidak ditemukan. Tidak dapat menyimpan pegawai.");
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      ...staffData.value,
      branches_id: branchId,
    };

    await axios.post('/api/user', payload);
    router.push({ name: 'users' });
  } catch (error: any) {
    console.error('Gagal menyimpan data pegawai:', error);
    if (error.response && error.response.status === 422) {
        alert('Gagal menyimpan: ' + error.response.data.message);
    }
  } finally {
    isSaving.value = false;
  }
};
</script>

