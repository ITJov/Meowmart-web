<template>
  <!-- DIUBAH: Properti 'expand-on-hover' dan 'rail' dihapus agar sidebar selalu lebar -->
  <VNavigationDrawer permanent>
    <VList>
      <VListItem
        prepend-avatar="/logo.svg"
        title="Meowmart Business"
        subtitle="meowmart@gmail.com"
      />
    </VList>

    <VDivider />

    <VList density="compact" nav>
      <!-- DIUBAH: Iterasi menggunakan filteredMenuItems -->
      <template v-for="item in filteredMenuItems" :key="item.title">
        
        <VListSubheader v-if="item.isSubheader" class="text-caption font-weight-bold text-uppercase">
          {{ item.title }}
        </VListSubheader>

        <VListGroup v-else-if="item.children" :value="item.title">
          <template #activator="{ props }">
            <VListItem
              v-bind="props"
              :prepend-icon="item.icon"
              :title="item.title"
            />
          </template>

          <VListItem
            v-for="child in filterChildren(item.children)"
            :key="child.title"
            :prepend-icon="child.icon"
            :title="child.title"
            :value="child.title"
            :to="child.to" 
          />
        </VListGroup>

        <VListItem
          v-else
          :prepend-icon="item.icon"
          :title="item.title"
          :value="item.title"
          :to="item.to"
        />
      </template>
      
      <VDivider class="my-2" />
      <VListItem
        prepend-icon="mdi-logout"
        title="Logout"
        @click="handleLogout"
      />

    </VList>
  </VNavigationDrawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/plugins/axios'

const router = useRouter()

// --- Dapatkan Peran Pengguna Saat Ini ---
const getRole = (): string => {
    const userDataString = localStorage.getItem('userData');
    if (userDataString) {
        const userData = JSON.parse(userDataString);
        // Asumsi 'role_name' dikirim dari backend (kasir, admin-cabang, super-admin)
        return userData.role_name ? userData.role_name.toLowerCase() : 'guest';
    }
    return 'guest';
};

const userRole = ref(getRole());

// --- Fungsi untuk Mengecek Izin ---
interface MenuItem {
    title: string;
    icon?: string;
    to?: string;
    roles?: string[]; // Array peran yang diizinkan
    isSubheader?: boolean;
    children?: MenuItem[];
}

const userHasAccess = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true; // Default: Jika tidak didefinisikan, semua bisa lihat
    return roles.includes(userRole.value);
};

const filterChildren = (children: MenuItem[]): MenuItem[] => {
    return children.filter(child => userHasAccess(child.roles));
}

const filteredMenuItems = computed(() => {
    return menuItems.value
        .map(item => {
            // Jika memiliki children, filter child-nya terlebih dahulu
            if (item.children) {
                const filteredChildren = filterChildren(item.children);
                // Jika group memiliki child yang tersisa, atau subheader, tampilkan
                if (filteredChildren.length > 0 || item.isSubheader) {
                    return { ...item, children: filteredChildren };
                }
                return null; // Sembunyikan group jika tidak ada child yang tersisa
            }
            // Jika item tunggal atau subheader, cek izinnya
            if (item.isSubheader || userHasAccess(item.roles)) {
                 return item;
            }
            return null;
        })
        .filter((item): item is MenuItem => item !== null);
});


// --- Definisi Menu Items dengan Peran (PENTING) ---

const menuItems = ref<MenuItem[]>([
  // Semua peran bisa lihat dashboard
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/dashboard', roles: ['super-admin', 'admin-cabang', 'kasir'] },
  
  // Grup Transactional
  { title: 'Transactional', isSubheader: true },
  // Semua peran transaksional
  { title: 'Registrasi', icon: 'mdi-clipboard-list-outline', to: '/registrations', roles: ['super-admin', 'admin-cabang', 'kasir'] },
  { title: 'Daftar Pet Hotel', icon: 'mdi-hospital-box-outline', to: '/petHotel', roles: ['super-admin', 'admin-cabang', 'kasir'] },
  { title: 'POS', icon: 'mdi-point-of-sale', to: '/products', roles: ['super-admin', 'admin-cabang', 'kasir'] },
  { title: 'Penjualan',
   icon: 'mdi-cart-outline', 
   roles: ['super-admin', 'admin-cabang', 'kasir'], // Semua bisa lihat group penjualan
    children: [
      { title: 'Penjualan', icon: 'mdi-receipt-text-outline', to: '/payment', roles: ['super-admin', 'admin-cabang', 'kasir'] },
      { title: 'Pembayaran Masuk', icon: 'mdi-cash-plus', to: '/pemasukan', roles: ['super-admin', 'admin-cabang', 'kasir'] },
    ],
   },

  // Grup Management Data
  { title: 'Management Data', isSubheader: true },
  // Master Data yang tidak boleh diubah Kasir
  { title: 'Hewan', icon: 'mdi-dog', to: '/pets', roles: ['super-admin', 'admin-cabang', 'kasir'] }, // PERBAIKAN: Tambah Kasir
  { title: 'Kandang', icon: 'mdi-kennel', to: '/kandangs', roles: ['super-admin', 'admin-cabang', 'kasir'] }, // PERBAIKAN: Tambah Kasir
  { title: 'Data Pengguna', icon: 'mdi-account-group-outline', to: '/customers', roles: ['super-admin', 'admin-cabang', 'kasir'] }, 
  { title: 'Pelayanan', icon: 'mdi-cut', to: '/service', roles: ['super-admin', 'admin-cabang'] },
  { title: 'Manajemen Produk', 
  icon: 'mdi-package-variant-closed', 
  roles: ['super-admin', 'admin-cabang'], // Hanya Admin yang bisa atur
    children: [
      { title: 'Manajemen Produk', icon: 'mdi-format-list-bulleted', to: '/listProducts', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Manajemen Kategori', icon: 'mdi-tag-outline', to: '/ListCategory', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Manajemen Brand', icon: 'mdi-label-outline', to: '/ListBrand', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Manajemen Discount', icon: 'mdi-label-outline', to: '/Discount', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Manajemen Pajak', icon: 'mdi-label-outline', to: '/tax', roles: ['super-admin'] }, // Pajak hanya Super Admin
    ], },
  { title: 'Data Pegawai', icon: 'mdi-account-tie', to: '/staff', roles: ['super-admin', 'admin-cabang'] }, // Hanya Admin yang bisa atur Pegawai
  
  // Grup Operasional
  { title: 'Operational', isSubheader: true },
  { title: 'Pembelian', icon: 'mdi-truck-delivery-outline', 
   roles: ['super-admin', 'admin-cabang'], 
    children: [
      { title: 'Pembelian Produk', icon: 'mdi-clipboard-plus-outline', to: '/purchases', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Pembayaran Keluar', icon: 'mdi-cash-minus', to: '/PembayaranKeluar', roles: ['super-admin', 'admin-cabang'] },
    ],
   },
  { title: 'Transfer Stok', icon: 'mdi-swap-horizontal', to: '/transfer-stock', roles: ['super-admin', 'admin-cabang'] },
  { title: 'Laporan', icon: 'mdi-file-chart-outline', 
    roles: ['super-admin', 'admin-cabang'], 
    children: [
      { title: 'Untung & Rugi', icon: 'mdi-chart-line', to: '/laporan/untung-rugi', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Pembayaran', icon: 'mdi-cash-multiple', to: '/laporan/pembayaran', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Minimum Stok', icon: 'mdi-archive-alert-outline', to: '/laporan/minimum-stock', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Rekap Penjualan', icon: 'mdi-chart-bar', to: '/laporan/penjualan', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Penjualan by produk', icon: 'mdi-package-variant-closed', to: '/laporan/penjualan-by-product', roles: ['super-admin', 'admin-cabang'] },
      { title: 'Rekap Stok', icon: 'mdi-warehouse', to: '/laporan/rekap-stok', roles: ['super-admin', 'admin-cabang'] },
    ],
   },
])


const handleLogout = async () => {
  try {
    await axios.post('/api/logout')
  }
  catch (error) {
    console.error('Logout di backend gagal, tetap lanjutkan:', error)
  }
  finally {
    localStorage.removeItem('userData')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('activeBranch') 
    router.push({ name: 'Login' })
  }
}
</script>

<style scoped>
.v-list-subheader {
  margin-top: 1rem;
}
</style>