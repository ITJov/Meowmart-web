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
      <template v-for="item in menuItems" :key="item.title">
        
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
            v-for="child in item.children"
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/plugins/axios'

const router = useRouter()

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

const menuItems = ref([
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/dashboard' },
  
  // Grup Transactional
  { title: 'Transactional', isSubheader: true },
  { title: 'Registrasi', icon: 'mdi-clipboard-list-outline', to: '/registrations' },
  { title: 'Daftar Pet Hotel', icon: 'mdi-hospital-box-outline', to: '/petHotel' },
  { title: 'POS', icon: 'mdi-point-of-sale', to: '/products' },
  { title: 'Penjualan',
   icon: 'mdi-cart-outline', 
    children: [
      { title: 'Penjualan', icon: 'mdi-receipt-text-outline', to: '/payment' },
      { title: 'Pembayaran Masuk', icon: 'mdi-cash-plus', to: '/pemasukan' },
    ],
   },

  // Grup Management Data
  { title: 'Management Data', isSubheader: true },
  { title: 'Hewan', icon: 'mdi-dog', to: '/pets' },
  { title: 'Kandang', icon: 'mdi-kennel', to: '/kandangs' },
  { title: 'Data Pengguna', icon: 'mdi-account-group-outline', to: '/customers' },
  { title: 'Pelayanan', icon: 'mdi-cut', to: '/service' },
  { title: 'Manajemen Produk', 
  icon: 'mdi-package-variant-closed', 
    children: [
      { title: 'Manajemen Produk', icon: 'mdi-format-list-bulleted', to: '/listProducts' },
      { title: 'Manajemen Kategori', icon: 'mdi-tag-outline', to: '/ListCategory' },
      { title: 'Manajemen Brand', icon: 'mdi-label-outline', to: '/ListBrand' },
    ], },
  { title: 'Data Pegawai', icon: 'mdi-account-tie', to: '/staff' },
  
  // Grup Operasional
  { title: 'Operational', isSubheader: true },
  { title: 'Pembelian', icon: 'mdi-truck-delivery-outline', 
    children: [
      { title: 'Pembelian Produk', icon: 'mdi-clipboard-plus-outline', to: '/purchases' },
      { title: 'Pembayaran Keluar', icon: 'mdi-cash-minus', to: '/PembayaranKeluar' },
    ],
   },
  { title: 'Transfer Stok', icon: 'mdi-swap-horizontal', to: '/stock-transfers' },
  { title: 'Stok Waktu', icon: 'mdi-timer-outline', to: '/stock-history' },
  { title: 'Laporan', icon: 'mdi-truck-delivery-outline', 
    children: [
      { title: 'Untung & Rugi', icon: 'mdi-clipboard-plus-outline', to: '/untungrugi' },
      { title: 'Pembayaran', icon: 'mdi-cash-minus', to: '/pembayaranlaporan' },
      { title: 'Minimum Stok', icon: 'mdi-cash-minus', to: '/PembayaranKeluar' },
      { title: 'Rekap Penjualan', icon: 'mdi-cash-minus', to: '/PembayaranKeluar' },
      { title: 'Penjualan by produk', icon: 'mdi-cash-minus', to: '/PembayaranKeluar' },
      { title: 'Rekap Stok', icon: 'mdi-cash-minus', to: '/PembayaranKeluar' },
    ],
   },
])
</script>

<style scoped>
.v-list-subheader {
  margin-top: 1rem;
}
</style>

