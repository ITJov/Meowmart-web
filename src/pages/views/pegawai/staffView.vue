<template>
  <!-- DITAMBAHKAN: Satu div sebagai elemen root tunggal -->
  <div>
    <VCard>
      <VCardTitle class="d-flex align-center pa-4">
        <span class="text-h5">Tabel Pegawai</span>
        <VSpacer />
        <VTextField
          v-model="search"
          density="compact"
          label="Pencarian"
          prepend-inner-icon="mdi-magnify"
          variant="solo-filled"
          flat
          hide-details
          single-line
          class="me-4"
          style="max-width: 250px;"
        />
        <!-- DIUBAH: Panggil fungsi untuk pindah halaman -->
        <VBtn color="primary" @click="goToCreatePage">
          <VIcon icon="mdi-plus" start />
          Tambah Pegawai Baru
        </VBtn>
      </VCardTitle>
    </VCard>

    <VDataTableServer
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :headers="headers"
      :items="staff"
      :items-length="totalStaff"
      :loading="loading"
      class="text-no-wrap"
      @update:options="fetchStaff"
    >
      <template #[`item.role.name`]="{ item }">
        <VChip size="small">{{ item.role?.name || '-' }}</VChip>
      </template>
      <template #[`item.created_at`]="{ item }">
        {{ new Date(item.created_at).toLocaleDateString('id-ID') }}
      </template>
      <template #[`item.actions`]="{ item }">
        <div class="d-flex gap-1">
          <!-- DIUBAH: Logika edit sekarang menggunakan halaman terpisah -->
          <VBtn icon="mdi-pencil" size="small" variant="text" @click="goToEditPage(item.id)" />
          <VBtn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem(item)" />
        </div>
      </template>
    </VDataTableServer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '../../../plugins/axios'

const router = useRouter();
const staff = ref<any[]>([]);
const search = ref('');
const loading = ref(true);
const totalStaff = ref(0);
const options = ref({ page: 1, itemsPerPage: 10 });

const headers = [
  { title: 'NAMA', key: 'name' },
  { title: 'EMAIL', key: 'email' },
  { title: 'PERAN', key: 'role.name', sortable: false },
  { title: 'TANGGAL DAFTAR', key: 'created_at' },
  { title: 'AKSI', key: 'actions', sortable: false },
] as const;

const getActiveBranchId = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString).id;
    return null;
}

const fetchStaff = async () => {
  const branchId = getActiveBranchId();
  if (!branchId) {
    alert('Cabang aktif tidak ditemukan.');
    staff.value = [];
    totalStaff.value = 0;
    return;
  }
  loading.value = true;
  try {
    // DIUBAH: Endpoint menjadi /api/users (plural)
    const { data } = await axios.get('/api/user', {
      params: {
        page: options.value.page,
        per_page: options.value.itemsPerPage,
        search: search.value,
        branches_id: branchId,
      },
    });
    if (data && data.data) {
      staff.value = data.data.data;
      totalStaff.value = data.data.total;
    }
  } catch (error) {
    console.error('Gagal mengambil data pegawai:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
    fetchStaff();
    window.addEventListener('branch-changed', fetchStaff);
});

onUnmounted(() => {
    window.removeEventListener('branch-changed', fetchStaff);
});

watch(search, () => {
  options.value.page = 1;
  fetchStaff();
});

// DIUBAH: Hapus logika modal, ganti dengan navigasi halaman
const goToCreatePage = () => {
  router.push({ name: 'addStaff-management' }); // Sesuaikan dengan nama route Anda
};

const goToEditPage = (id: number) => {
  // Anda perlu membuat halaman Edit.vue dan mendaftarkan route-nya
  // router.push({ name: 'edit-user', params: { id } });
  alert(`Navigasi ke halaman edit untuk user ID: ${id}`);
};

const deleteItem = async (item: any) => {
  if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
    loading.value = true;
    try {
      // DIUBAH: Endpoint menjadi /api/users (plural)
      await axios.delete(`/api/user/${item.id}`);
      fetchStaff();
    } catch (error) {
      console.error('Gagal menghapus data pegawai:', error);
    } finally {
      loading.value = false;
    }
  }
};
</script>

