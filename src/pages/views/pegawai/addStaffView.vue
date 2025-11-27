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
          
          <!-- KOLOM PILIH CABANG -->
          <VCol cols="12" md="6">
            <VSelect
              v-model="staffData.branches_id"
              :items="allBranches"
              item-title="name"
              item-value="id"
              label="Cabang Penempatan"
              :rules="[v => !!v || 'Cabang wajib dipilih']"
              variant="outlined"
              density="compact"
            />
          </VCol>
          
          <!-- KOLOM PILIH ROLE -->
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

// State untuk data form (dengan tipe data yang benar)
const staffData = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  role_id: null as number | null,
  branches_id: null as number | null, 
});

const roles = ref<any[]>([]);
const allBranches = ref<any[]>([]);

const fetchDropdownData = async () => {
  try {
    // 1. Ambil data Roles
    const rolesResponse = await axios.get('/api/roles');
    if (rolesResponse.data && rolesResponse.data.data) {
      roles.value = rolesResponse.data.data;
    }

    // 2. Ambil data Branches
    const branchesResponse = await axios.get('/api/branches?all=true');
    if (branchesResponse.data && branchesResponse.data.data) {
      allBranches.value = branchesResponse.data.data; 

      // Set default cabang
      const activeBranchString = localStorage.getItem('activeBranch');
      if (activeBranchString) {
          const activeBranch = JSON.parse(activeBranchString);
          staffData.value.branches_id = activeBranch.id;
      } else if (allBranches.value.length > 0) {
          staffData.value.branches_id = allBranches.value[0].id;
      }
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

  // Cek validasi terakhir di frontend
  if (!staffData.value.branches_id) {
    alert("Cabang penempatan wajib dipilih.");
    return;
  }
  if (!staffData.value.role_id) {
    alert("Peran (Role) wajib dipilih.");
    return;
  }


  isSaving.value = true;
  try {
    const payload = {
      ...staffData.value,
    };

    // Endpoint User (User Controller)
    await axios.post('/api/user', payload); 
    
    // === PERUBAHAN UTAMA DI SINI: ALERT & NAVIGASI ===
    alert('Data pegawai berhasil dibuat!');
    
    // Navigasi ke page view pegawai (Asumsi nama route-nya adalah 'users')
    setTimeout(() => {
        router.push({ name: 'users' }); 
    }, 500); // Tunggu 0.5 detik agar alert sempat terlihat

  } catch (error: any) {
    console.error('Gagal menyimpan data pegawai:', error);
    if (error.response && error.response.status === 422) {
        const errors = error.response.data.errors;
        let errorMessage = error.response.data.message || 'Gagal menyimpan.';
        if (errors) {
            errorMessage += '\n' + Object.values(errors).flat().join('\n');
        }
        alert(errorMessage);
    }
  } finally {
    isSaving.value = false;
  }
};
</script>