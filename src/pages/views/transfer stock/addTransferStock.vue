<template>
  <VCard>
    <VCardTitle class="pa-4 d-flex align-center">
      <span class="text-h6">Buat Transfer Stok Baru</span>
    </VCardTitle>
    <VDivider />

    <VCardText>
      <VRow>
        <VCol cols="12" md="4">
          <VSelect
            v-model="transfer.from_warehouse_id"
            :items="warehouseList"
            item-title="name"
            item-value="id"
            label="Dari Gudang (Asal)"
            variant="outlined"
            density="compact"
            placeholder="Pilih Gudang Asal"
            @update:modelValue="fetchProductsForSource"
          />
        </VCol>
        <VCol cols="12" md="4">
          <VSelect
            v-model="transfer.to_warehouse_id"
            :items="warehouseList"
            item-title="name"
            item-value="id"
            label="Ke Gudang (Tujuan)"
            variant="outlined"
            density="compact"
            placeholder="Pilih Gudang Tujuan"
            :error-messages="transfer.from_warehouse_id && transfer.from_warehouse_id === transfer.to_warehouse_id ? 'Gudang asal dan tujuan harus berbeda cabang' : ''"
          />
        </VCol>
        <VCol cols="12" md="4">
          <VTextField
            v-model="transfer.transfer_date"
            type="date"
            label="Tanggal Transfer"
            variant="outlined"
            density="compact"
          />
        </VCol>
      </VRow>

      <VDivider class="my-4" />

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Item Produk</h3>
      
      <VRow align="center">
        <VCol cols="12" md="5">
          <VAutocomplete
            v-model="selectedProduct"
            :items="productList"
            item-title="name"
            item-value="id"
            label="Pilih Produk"
            placeholder="Ketik nama produk..."
            variant="outlined"
            density="compact"
            return-object
            clearable
            hide-details="auto"
            :disabled="!transfer.from_warehouse_id"
            no-data-text="Pilih gudang asal dahulu / Produk tidak ditemukan"
          >
            <template #item="{ props, item }">
              <VListItem v-bind="props" :subtitle="`Stok: ${getStockAmount(item.raw)} ${item.raw.unit?.short_name || ''}`" />
            </template>
          </VAutocomplete>
        </VCol>
        
        <VCol cols="12" md="3">
          <VTextField
            v-model.number="selectedQuantity"
            type="number"
            label="Jumlah Transfer"
            variant="outlined"
            density="compact"
            :disabled="!selectedProduct"
            hide-details="auto"
            min="1" 
            :suffix="selectedProduct?.unit?.short_name || ''"
          />
          <div v-if="selectedProduct" class="text-caption text-grey mt-1">
            Maksimal: {{ getStockAmount(selectedProduct) }}
          </div>
        </VCol>

        <VCol cols="12" md="2">
          <VBtn 
            color="primary" 
            variant="tonal" 
            block 
            @click="addItem" 
            :disabled="!selectedProduct || !selectedQuantity"
          >
            <VIcon start icon="mdi-plus" /> Tambah
          </VBtn>
        </VCol>
      </VRow>

      <VTable class="mt-4 border rounded" hover>
        <thead>
          <tr>
            <th>Produk</th>
            <th class="text-center">Jumlah</th>
            <th class="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="transfer.items.length === 0">
            <td colspan="3" class="text-center text-medium-emphasis py-4">
              Belum ada produk yang ditambahkan.
            </td>
          </tr>
          <tr v-for="(item, index) in transfer.items" :key="index">
            <td>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey">{{ item.item_code || '-' }}</div>
            </td>
            <td class="text-center">
              <VChip size="small" color="primary">{{ item.quantity }} {{ item.unit_name }}</VChip>
            </td>
            <td class="text-right">
              <VBtn icon="mdi-delete" variant="text" color="error" size="small" @click="removeItem(index)" />
            </td>
          </tr>
        </tbody>
      </VTable>

    </VCardText>

    <VCardActions class="pa-4 bg-grey-lighten-5">
      <VSpacer />
      <VBtn 
        color="secondary" 
        variant="text" 
        @click="router.back()"
      >
        Batal
      </VBtn>
      <VBtn 
        color="primary" 
        variant="elevated"
        @click="saveTransfer" 
        :loading="isLoading"
        :disabled="transfer.items.length === 0 || !transfer.to_warehouse_id"
      >
        Proses Transfer
      </VBtn>
    </VCardActions>
  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from '../../../plugins/axios'
import { useRouter } from 'vue-router';

const router = useRouter();
const isLoading = ref(false);

// --- Data Master ---
const warehouseList = ref<any[]>([]);
const productList = ref<any[]>([]);

// --- Form State ---
const transfer = ref({
  from_warehouse_id: null as number | null,
  to_warehouse_id: null as number | null,
  transfer_date: new Date().toISOString().split('T')[0],
  status: 'Completed',
  items: [] as any[],
});

const selectedProduct = ref<any | null>(null);
const selectedQuantity = ref<number | null>(null);

// --- Methods Helper ---
const getStockAmount = (product: any) => {
    // Mengambil stok dari array details. 
    // Asumsi: API product sudah difilter berdasarkan cabang gudang asal
    return product.details?.[0]?.current_stock || 0;
};

// --- Fetch Data ---
onMounted(async () => {
  try {
    // Ambil Data Gudang
    const { data: wh } = await axios.get('/api/warehouse?all=true');
    warehouseList.value = wh.data || wh; // Handle format response
  } catch (error) {
      console.error("Gagal memuat gudang:", error);
  }
});

// Saat gudang asal dipilih, ambil produk KHUSUS untuk cabang gudang tersebut
// Ini penting agar kita tahu stok yang benar
const fetchProductsForSource = async () => {
    productList.value = [];
    selectedProduct.value = null;
    
    if (!transfer.value.from_warehouse_id) return;

    // Cari object gudang untuk dapat ID cabangnya
    const sourceWh = warehouseList.value.find(w => w.id === transfer.value.from_warehouse_id);
    if (!sourceWh) return;

    try {
        // Panggil API products dengan filter branches_id
        const { data } = await axios.get('/api/products', {
            params: {
                branches_id: sourceWh.branches_id, // Filter stok berdasarkan cabang ini
                per_page: 100 // Ambil banyak agar tampil di dropdown
            }
        });
        productList.value = data.data.data; // Laravel paginate structure
    } catch (e) {
        console.error("Gagal memuat produk sumber", e);
    }
}

// --- Add Item Logic ---
const addItem = () => {
  if (!selectedProduct.value || !selectedQuantity.value) return;

  // 1. Validasi Input Negatif
  if (selectedQuantity.value <= 0) {
      alert("Jumlah transfer minimal 1.");
      return;
  }

  // 2. Validasi Stok Tersedia (UX Improvement)
  const currentStock = getStockAmount(selectedProduct.value);
  if (selectedQuantity.value > currentStock) {
      alert(`Stok tidak mencukupi! Stok di gudang asal hanya: ${currentStock}`);
      return;
  }

  // 3. Cek Duplikasi di List Sementara
  const existingIndex = transfer.value.items.findIndex(item => item.product_id === selectedProduct.value.id);
  if (existingIndex !== -1) {
      alert("Produk ini sudah ada di daftar. Hapus dulu jika ingin mengubah jumlah.");
      return;
  }
  
  // 4. Tambahkan ke Array
  transfer.value.items.push({
    product_id: selectedProduct.value.id,
    name: selectedProduct.value.name,
    item_code: selectedProduct.value.item_code,
    quantity: selectedQuantity.value,
    unit_name: selectedProduct.value.unit?.short_name || 'Pcs'
  });

  // Reset Input Item
  selectedProduct.value = null;
  selectedQuantity.value = null;
};

const removeItem = (index: number) => {
  transfer.value.items.splice(index, 1);
};

// --- Simpan Transaksi ---
const saveTransfer = async () => {
  // Validasi Frontend Sederhana
  if (transfer.value.from_warehouse_id === transfer.value.to_warehouse_id) {
    alert('Gudang asal dan tujuan tidak boleh sama.');
    return;
  }
  
  isLoading.value = true;
  try {
    await axios.post('/api/transfer-stock', transfer.value);
    alert('Transfer stok berhasil!');
    router.push({ name: 'transfer-stock-list' }); // Sesuaikan nama route list Anda
  } catch (error: any) {
    console.error('Gagal menyimpan transfer:', error);
    const msg = error.response?.data?.message || 'Terjadi kesalahan server.';
    alert(`Gagal: ${msg}`);
  } finally {
    isLoading.value = false;
  }
};
</script>