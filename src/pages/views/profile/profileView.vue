<template>
  <div class="pa-4 pa-md-6 user-profile-container">
    
    <!-- Bagian 1: Header Profil -->
    <VCard class="mb-5" elevation="3">
      <VCardText>
        <div class="d-flex flex-column flex-md-row align-center">
          <VAvatar size="80" class="me-4 mb-3 mb-md-0">
            <VImg :src="userData.avatar || 'https://placehold.co/80x80/8888ff/ffffff?text=U'" />
          </VAvatar>
          
          <div class="flex-grow-1">
            <h1 class="text-h5 font-weight-bold">{{ userData.name }}</h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              <span class="me-4">{{ userData.role }}</span>
              <VIcon icon="mdi-calendar-range" size="18" class="me-1" />
              Joined {{ userData.joinDate }}
            </p>
          </div>
          
          <VBtn color="warning" variant="flat">
             Beli Addon
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <!-- Bagian 2: Tabs dan Konten Utama -->
    <VCard elevation="3">
      <VTabs v-model="activeTab" density="default" color="primary">
        <VTab value="account">Akun</VTab>
        <VTab value="payment">Metode Pembayaran</VTab>        
        <VTab v-if="userRole === 'super-admin'" value="outlet">Outlet</VTab> 
      </VTabs>
      
      <VDivider />

      <VCardText>
        <VWindow v-model="activeTab">
          
          <!-- TAB 1: AKUN (PENGATURAN PERUSAHAAN + PROFIL) -->
          <VWindowItem value="account">
            <div class="content-container"> 
                <VForm @submit.prevent="saveSettings">
                
                <!-- SECTION: PENGATURAN PERUSAHAAN -->
                <h2 class="text-h6 font-weight-bold mb-4 mt-2">Pengaturan Perusahaan</h2>
                <VRow>
                    <VCol cols="12" md="6">
                        <VTextField
                            v-model="companySettings.companyName"
                            label="Nama Perusahaan"
                            variant="outlined" density="compact"
                            :readonly="!isAdminOrSuperAdmin"
                        />
                    </VCol>
                    <VCol cols="12" md="6">
                        <VTextField
                            v-model="companySettings.shortName"
                            label="Nama Pendek Perusahaan"
                            variant="outlined" density="compact"
                            :readonly="!isAdminOrSuperAdmin"
                        />
                    </VCol>
                    
                    <VCol cols="12" md="6">
                        <VTextField
                            v-model="companySettings.email"
                            label="Email Perusahaan"
                            variant="outlined" density="compact"
                            :readonly="!isAdminOrSuperAdmin"
                        />
                    </VCol>
                    <VCol cols="12" md="6">
                        <VTextField
                            v-model="companySettings.phone"
                            label="Telepon Perusahaan"
                            variant="outlined" density="compact"
                            :readonly="!isAdminOrSuperAdmin"
                        />
                    </VCol>

                    <VCol cols="12">
                        <VTextarea
                            v-model="companySettings.address"
                            label="Alamat Perusahaan"
                            variant="outlined" density="compact" rows="2"
                            :readonly="!isAdminOrSuperAdmin"
                        />
                    </VCol>
                </VRow>
            </VForm>
            </div>
          </VWindowItem>
          
          <!-- TAB 2, 3: Placeholder (Sama) -->
          <VWindowItem value="payment">
             <p class="text-medium-emphasis text-center py-10">Fitur Metode Pembayaran akan hadir segera.</p>
          </VWindowItem>
    
          <!-- TAB 4: OUTLET (CRUD Cabang) - HANYA UNTUK SUPER ADMIN -->
          <VWindowItem v-if="userRole === 'super-admin'" value="outlet">
            <h2 class="text-h6 font-weight-bold mb-4 mt-2">Manajemen Daftar Cabang</h2>
            <VCard flat border class="mb-4">
                 <VCardTitle class="d-flex align-center py-2">
                    <VTextField
                        v-model="branchSearch"
                        density="compact"
                        placeholder="Cari Cabang..."
                        prepend-inner-icon="mdi-magnify"
                        variant="solo-filled"
                        flat
                        hide-details
                        style="max-width: 250px;"
                        class="me-4"
                    />
                    <VSpacer />
                    <VBtn color="primary" @click="openBranchDialog(false)">
                        <VIcon icon="mdi-plus" start />
                        Tambah Cabang
                    </VBtn>
                 </VCardTitle>
            </VCard>

            <VDataTableServer
                v-model:items-per-page="branchOptions.itemsPerPage"
                v-model:page="branchOptions.page"
                :headers="branchHeaders"
                :items="branches"
                :items-length="totalBranches"
                :loading="branchLoading"
                class="text-no-wrap"
                @update:options="fetchBranchesData"
            >
                <template #[`item.actions`]="{ item }">
                    <VBtn icon="mdi-pencil" size="small" variant="text" @click="openBranchDialog(true, item)" />
                    <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteBranch(item)" />
                </template>
            </VDataTableServer>
          </VWindowItem>
          
        </VWindow>
      </VCardText>
    </VCard>
    
    <!-- DIALOG TAMBAH/EDIT CABANG -->
    <VDialog v-model="isBranchDialogVisible" max-width="500px" persistent>
        <VCard :loading="branchSaving">
            <VCardTitle class="pa-4 bg-grey-lighten-4">
                <span class="text-h5">{{ isEditBranch ? 'Edit Cabang' : 'Tambah Cabang Baru' }}</span>
            </VCardTitle>
            <VCardText>
                <VForm ref="branchFormRef" @submit.prevent="saveBranch">
                    <VTextField
                        v-model="currentBranch.name"
                        label="Nama Cabang"
                        :rules="[v => !!v || 'Nama wajib diisi']"
                        variant="outlined" density="compact" class="mt-4"
                    />
                    <VTextField
                        v-model="currentBranch.email"
                        label="Email Cabang"
                        :rules="[v => !!v || 'Email wajib diisi']"
                        variant="outlined" density="compact"
                    />
                    <VTextField
                        v-model="currentBranch.phone"
                        label="Telepon Cabang"
                        :rules="[v => !!v || 'Telepon wajib diisi']"
                        variant="outlined" density="compact"
                    />
                    <VTextarea
                        v-model="currentBranch.address"
                        label="Alamat Cabang"
                        :rules="[v => !!v || 'Alamat wajib diisi']"
                        variant="outlined" density="compact" rows="2"
                    />
                </VForm>
            </VCardText>
            <VCardActions class="pa-4">
                <VSpacer />
                <VBtn color="secondary" variant="text" @click="isBranchDialogVisible = false">Batal</VBtn>
                <VBtn color="primary" variant="flat" @click="saveBranch" :loading="branchSaving">Simpan</VBtn>
            </VCardActions>
        </VCard>
    </VDialog>
    
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="top">{{ snackbar.message }}</VSnackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/plugins/axios';
import type { VForm } from 'vuetify/components';

const router = useRouter();

const activeTab = ref('account');
const isSaving = ref(false);
const snackbar = ref({ show: false, message: '', color: 'success' });
const showSnackbar = (message: string, color: string = 'success') => {
    snackbar.value = { show: true, message, color };
};

// --- GET USER ROLE ---
const getUserRole = (): string => {
    const userDataString = localStorage.getItem('userData');
    if (userDataString) {
        const userData = JSON.parse(userDataString);
        return userData.role_name ? userData.role_name.toLowerCase() : 'kasir'; 
    }
    return 'kasir'; 
};

const userRole = computed(() => getUserRole());
const isAdminOrSuperAdmin = computed(() => userRole.value === 'super-admin' || userRole.value === 'admin-cabang');

const userData = ref({
    name: 'Meowmart', role: 'Admin-Merchant', joinDate: 'September 2023',
    phone: '+6281234567890', avatar: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=100&q=80',
});

const companySettings = ref({
    companyName: 'Meowmart Business', shortName: 'Meowmart', email: 'contact@meowmart.com',
    phone: '+6281234567890', address: 'Jakarta, Indonesia',
});

const profileSettings = ref({
    userName: userData.value.name, userEmail: 'meowmart@gmail.com', userPhone: userData.value.phone,
    userRole: 'Admin', currentPassword: '', newPassword: '',
});

const saveSettings = () => {
    isSaving.value = true;
    setTimeout(() => {
        isSaving.value = false;
        showSnackbar('Pengaturan berhasil disimpan!', 'success');
        profileSettings.value.currentPassword = '';
        profileSettings.value.newPassword = '';
    }, 1500);
};

const branches = ref<any[]>([]);
const totalBranches = ref(0);
const branchLoading = ref(true);
const branchSaving = ref(false);
const branchSearch = ref('');
const isBranchDialogVisible = ref(false);
const isEditBranch = ref(false);
const branchFormRef = ref<VForm>();

const branchOptions = ref({
    page: 1,
    itemsPerPage: 10,
});

const defaultBranch = { id: 0, name: '', email: '', phone: '', address: '' };
const currentBranch = ref({ ...defaultBranch });

// === PERBAIKAN HEADERS VDATATABLE ===
const branchHeaders = [
    { title: 'NAMA CABANG', key: 'name', align: 'start' as const },
    { title: 'EMAIL', key: 'email', align: 'start' as const },
    { title: 'TELEPON', key: 'phone', align: 'start' as const },
    { title: 'AKSI', key: 'actions', sortable: false as const, align: 'end' as const },
] as const;
// ===================================

const fetchBranchesData = async () => {
    if (userRole.value !== 'super-admin') return; 
    
    branchLoading.value = true;
    try {
        const { data } = await axios.get('/api/branches', {
            params: {
                page: branchOptions.value.page,
                per_page: branchOptions.value.itemsPerPage,
                search: branchSearch.value,
            }
        });
        branches.value = data.data.data; 
        totalBranches.value = data.data.total;
    } catch (error) {
        console.error('Gagal mengambil data cabang:', error);
    } finally {
        branchLoading.value = false;
    }
};

const openBranchDialog = (isEdit: boolean, item: any | null = null) => {
    isEditBranch.value = isEdit;
    currentBranch.value = item ? { ...item } : { ...defaultBranch };
    isBranchDialogVisible.value = true;
};

const saveBranch = async () => {
    const { valid } = await branchFormRef.value!.validate();
    if (!valid) return;
    
    branchSaving.value = true;
    try {
        if (isEditBranch.value && currentBranch.value.id) {
            await axios.put(`/api/branches/${currentBranch.value.id}`, currentBranch.value);
            showSnackbar('Cabang berhasil diperbarui!', 'success');
        } else {
            await axios.post('/api/branches', currentBranch.value);
            showSnackbar('Cabang berhasil dibuat!', 'success');
        }
        isBranchDialogVisible.value = false;
        fetchBranchesData();
    } catch (error: any) {
        console.error('Gagal menyimpan cabang:', error);
        showSnackbar(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan cabang.', 'error');
    } finally {
        branchSaving.value = false;
    }
};

const deleteBranch = async (item: any) => {
    if (confirm(`Anda yakin ingin menghapus cabang ${item.name}?`)) {
        branchLoading.value = true;
        try {
            await axios.delete(`/api/branches/${item.id}`);
            showSnackbar('Cabang berhasil dihapus.', 'success');
            fetchBranchesData();
        } catch (error: any) {
            console.error('Gagal menghapus cabang:', error);
            showSnackbar(error.response?.data?.message || 'Gagal menghapus cabang.', 'error');
        } finally {
            branchLoading.value = false;
        }
    }
};

// --- LIFECYCLE & WATCHERS ---
watch(branchSearch, () => {
    branchOptions.value.page = 1;
    fetchBranchesData();
});

// Hanya fetch data cabang jika tab aktif adalah 'outlet'
watch(activeTab, (newTab) => {
    if (newTab === 'outlet') {
        fetchBranchesData();
    }
});

onMounted(() => {
    // Initial load, jika Anda ingin data cabang langsung muncul di tab Outlet saat halaman dimuat
    // Kita tidak perlu fetch di sini, karena watcher akan memicu fetch jika tab === 'outlet'
});
</script>

<style scoped>
.user-profile-container {
    max-width: 1200px;
    margin: 0 auto;
}
.v-card-text .v-row {
    --v-row-gap: 20px;
}
.v-tabs {
    background-color: white;
}
/* PERBAIKAN UTAMA UNTUK MENCEGAH VWindow RUNTUH */
.v-window-item {
    height: auto !important;
    min-height: 500px; /* Minimal tinggi agar tidak tersembunyi */
}
.content-container {
    height: 100%;
}
</style>