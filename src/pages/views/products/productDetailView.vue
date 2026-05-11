<template>
  <div class="pa-4">
    <VBtn variant="text" prepend-icon="mdi-arrow-left" @click="$router.back()" class="mb-4">
      Kembali ke Daftar Produk
    </VBtn>

    <VRow v-if="product">
      <VCol cols="12" md="4">
        <VCard elevation="2" class="pa-4 text-center">
          <VImg :src="product.image_url || 'https://placehold.co/200'" height="200" contain class="rounded-lg mb-4" />
          <h2 class="text-h5 font-weight-bold">{{ product.name }}</h2>
          <p class="text-caption text-grey">{{ product.item_code }}</p>
          <VDivider class="my-3" />
          <div class="d-flex justify-space-around">
            <div>
              <div class="text-caption text-grey">Total Stok</div>
              <div class="text-h6">{{ totalStock }}</div>
            </div>
            <div>
              <div class="text-caption text-grey">Kategori</div>
              <div class="text-h6">{{ product.category?.name || '-' }}</div>
            </div>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="8">
        <VCard elevation="2">
          <VCardTitle class="bg-primary text-white d-flex align-center">
            <VIcon icon="mdi-layers-triple" class="me-2" />
            Manajemen Batch (FEFO)
          </VCardTitle>
          
          <VTable>
            <thead>
              <tr>
                <th class="text-left">Batch Code</th>
                <th class="text-center">Stok</th>
                <th class="text-left">Tanggal Kadaluwarsa</th>
                <th class="text-center">Status ED</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="batch in product.batches" :key="batch.id">
                <td class="font-weight-medium">{{ batch.batch_code }}</td>
                <td class="text-center">{{ batch.quantity }}</td>
                <td>{{ formatDate(batch.expiry_date) }}</td>
                <td class="text-center">
                  <VChip :color="getBatchExpiryColor(batch.expiry_date)" size="small" variant="flat">
                    {{ getBatchExpiryText(batch.expiry_date) }}
                  </VChip>
                </td>
              </tr>
              <tr v-if="product.batches?.length === 0">
                <td colspan="4" class="text-center py-4 text-grey">Belum ada data batch untuk produk ini.</td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from '@/plugins/axios';

const route = useRoute();
const product = ref<any>(null);
const loading = ref(false);

const totalStock = computed(() => {
  if (product.value?.details && product.value.details.length > 0) {
    return product.value.details[0].current_stock;
  }
  return 0;
});

const fetchProductDetail = async () => {
  const branchId = JSON.parse(localStorage.getItem('activeBranch') || '{}').id;
  loading.value = true;
  try {
    const { data } = await axios.get(`/api/products/${route.params.id}`, {
      params: { branches_id: branchId }
    });
    product.value = data.data;
  } catch (error) {
    console.error("Gagal ambil detail:", error);
  } finally {
    loading.value = false;
  }
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

const getBatchExpiryColor = (date: string) => {
  const diff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'error';
  if (diff < 30) return 'warning';
  return 'success';
};

const getBatchExpiryText = (date: string) => {
  const diff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Expired';
  if (diff < 30) return 'Segera Expired';
  return 'Aman';
};

onMounted(fetchProductDetail);
</script>