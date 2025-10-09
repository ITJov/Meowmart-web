<template>
  <VCard>
    <VCardTitle class="pa-4 bg-grey-lighten-4">
      <span class="text-h5">Edit Produk</span>
    </VCardTitle>
    <VCardText class="pt-4">
      <VForm ref="refVForm" @submit.prevent="updateProduct">
        <VRow>
          <!-- Kolom Kiri: Data Produk Global -->
          <VCol cols="12" md="8">
            <VTextField
              v-model="productData.name"
              label="Nama Produk"
              :rules="[v => !!v || 'Nama wajib diisi']"
              variant="outlined"
              density="compact"
              class="mb-4"
            />
            <VTextarea
              v-model="productData.description"
              label="Deskripsi"
              variant="outlined"
              density="compact"
              rows="3"
              class="mb-4"
            />
            <VRow>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="productData.category_id"
                  label="Kategori"
                  :items="categories"
                  item-title="name"
                  item-value="id"
                  variant="outlined"
                  density="compact"
                  class="mb-4"
                />
                <VSelect
                  v-model="productData.unit_id"
                  label="Unit"
                  :items="units"
                  item-title="name"
                  item-value="id"
                  variant="outlined"
                  density="compact"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="productData.brand_id"
                  label="Brand"
                  :items="brands"
                  item-title="name"
                  item-value="id"
                  variant="outlined"
                  density="compact"
                  class="mb-4"
                  clearable
                />
                <VTextField
                  v-model="productData.item_code"
                  label="Kode Item"
                  variant="outlined"
                  density="compact"
                />
              </VCol>
            </VRow>
          </VCol>

          <!-- Kolom Kanan: Foto Produk -->
          <VCol cols="12" md="4">
            <VFileInput
              v-model="productData.photo"
              label="Foto Produk"
              accept="image/*"
              variant="outlined"
              density="compact"
              prepend-icon="mdi-camera"
              @change="previewImage"
            />
            <VImg
              :src="imagePreview || 'https://placehold.co/400x400/eeeeee/cccccc?text=Preview'"
              class="mt-4 rounded"
              aspect-ratio="1"
              cover
            />
          </VCol>
        </VRow>
        
        <VDivider class="my-6" />
        
        <!-- Bagian Harga & Stok per Cabang -->
        <h3 class="text-h6 mb-4">Detail Harga & Stok (untuk cabang: {{ activeBranchName }})</h3>
        <VRow>
            <VCol cols="12" md="4">
                <VTextField
                    v-model.number="productData.purchase_price"
                    label="Harga Beli"
                    type="number"
                    prefix="Rp"
                    variant="outlined"
                    density="compact"
                />
            </VCol>
            <VCol cols="12" md="4">
                <VTextField
                    v-model.number="productData.sales_price"
                    label="Harga Jual"
                    type="number"
                    prefix="Rp"
                    variant="outlined"
                    density="compact"
                />
            </VCol>
            <VCol cols="12" md="4">
                <VTextField
                    v-model.number="productData.current_stock"
                    label="Stok Saat Ini"
                    type="number"
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
      <VBtn color="primary" @click="updateProduct" variant="flat" :loading="isSaving">Update Produk</VBtn>
    </VCardActions>
  </VCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from '@/plugins/axios';
import type { VForm } from 'vuetify/components';

const router = useRouter();
const route = useRoute();
const refVForm = ref<VForm>();
const isSaving = ref(false);

const productData = ref({
  name: '',
  description: '',
  category_id: null,
  unit_id: null,
  brand_id: null,
  item_code: '',
  photo: null as File[] | null,
  // Detail per cabang
  purchase_price: 0,
  sales_price: 0,
  current_stock: 0,
});

const categories = ref([]);
const units = ref([]);
const brands = ref([]);
const imagePreview = ref<string | null>(null);
const activeBranchName = ref('');

const getActiveBranch = () => {
    const activeBranchString = localStorage.getItem('activeBranch');
    if (activeBranchString) return JSON.parse(activeBranchString);
    return null;
}

const previewImage = () => {
  if (productData.value.photo && productData.value.photo[0]) {
    imagePreview.value = URL.createObjectURL(productData.value.photo[0]);
  }
};

const fetchProductData = async () => {
  const activeBranch = getActiveBranch();
  if (!activeBranch) {
      alert("Cabang aktif tidak ditemukan!");
      router.back();
      return;
  }
  activeBranchName.value = activeBranch.name;
  
  const productId = route.params.id;

  try {
    const { data } = await axios.get(`/api/products/${productId}`, {
      params: { branches_id: activeBranch.id }
    });

    const fetched = data.data;
    productData.value = {
      ...productData.value,
      name: fetched.name,
      description: fetched.description,
      category_id: fetched.category_id,
      unit_id: fetched.unit_id,
      brand_id: fetched.brand_id,
      item_code: fetched.item_code,
      purchase_price: fetched.details[0]?.purchase_price || 0,
      sales_price: fetched.details[0]?.sales_price || 0,
      current_stock: fetched.details[0]?.current_stock || 0,
    };
    imagePreview.value = fetched.image_url;

  } catch (error) {
    console.error("Gagal mengambil data produk:", error);
  }
};

const fetchDropdownData = async () => {
  try {
    const [catRes, unitRes, brandRes] = await Promise.all([
      axios.get('/api/categories?all=true'),
      axios.get('/api/units?all=true'),
      axios.get('/api/brands?all=true'),
    ]);
    categories.value = catRes.data.data.data;
    units.value = unitRes.data.data.data;
    brands.value = brandRes.data.data.data;
  } catch (error) {
    console.error("Gagal mengambil data dropdown:", error);
  }
};

onMounted(() => {
  fetchProductData();
  fetchDropdownData();
});

const cancel = () => {
  router.back();
};

const updateProduct = async () => {
  const { valid } = await refVForm.value!.validate();
  if (!valid) return;

  const activeBranch = getActiveBranch();
  if (!activeBranch) return;

  isSaving.value = true;
  
  const formData = new FormData();
  formData.append('name', productData.value.name);
  formData.append('description', productData.value.description || '');
  formData.append('category_id', productData.value.category_id!);
  formData.append('unit_id', productData.value.unit_id!);
  if (productData.value.brand_id) formData.append('brand_id', productData.value.brand_id);
  if (productData.value.item_code) formData.append('item_code', productData.value.item_code);
  
  formData.append('branches_id', activeBranch.id);
  formData.append('purchase_price', String(productData.value.purchase_price));
  formData.append('sales_price', String(productData.value.sales_price));
  formData.append('current_stock', String(productData.value.current_stock));

  if (productData.value.photo && productData.value.photo[0]) {
    formData.append('photo', productData.value.photo[0]);
  }

  formData.append('_method', 'PUT');

  try {
    const productId = route.params.id;
    await axios.post(`/api/products/${productId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    // DIUBAH: Pindahkan ke halaman sebelumnya (halaman daftar produk)
    router.back();
  } catch (error) {
    console.error('Gagal memperbarui produk:', error);
  } finally {
    isSaving.value = false;
  }
};
</script>

