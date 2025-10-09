<template>
  <div>
    <VRow>
      <!-- Kolom Kiri: Informasi Produk -->
      <VCol cols="12" md="8">
        <VCard>
          <VCardTitle class="pa-4 bg-grey-lighten-4">
            <span class="text-h5">Informasi Produk</span>
          </VCardTitle>
          <VCardText class="pt-4">
            <VForm ref="refVForm" @submit.prevent="save">
              <VRow>
                <VCol cols="12">
                  <VTextField
                    v-model="productData.name"
                    label="Nama Produk"
                    :rules="[v => !!v || 'Nama wajib diisi']"
                    variant="outlined" density="compact"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VSelect
                    v-model="productData.category_id"
                    :items="categories"
                    item-title="name" item-value="id"
                    label="Kategori"
                    :rules="[v => !!v || 'Kategori wajib dipilih']"
                    variant="outlined" density="compact"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VSelect
                    v-model="productData.brand_id"
                    :items="brands"
                    item-title="name" item-value="id"
                    label="Brand"
                    variant="outlined" density="compact"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VSelect
                    v-model="productData.unit_id"
                    :items="units"
                    item-title="name" item-value="id"
                    label="Unit"
                    :rules="[v => !!v || 'Unit wajib dipilih']"
                    variant="outlined" density="compact"
                  />
                </VCol>
                <VCol cols="12">
                  <VTextarea
                    v-model="productData.description"
                    label="Deskripsi"
                    variant="outlined" density="compact"
                    rows="3"
                  />
                </VCol>
              </VRow>
            </VForm>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Kolom Kanan: Gambar -->
      <VCol cols="12" md="4">
        <VCard>
           <VCardTitle class="pa-4 bg-grey-lighten-4">
            <span class="text-h6">Gambar Produk</span>
          </VCardTitle>
          <VCardText class="text-center">
            <VAvatar rounded size="150" class="mb-4">
              <VImg :src="previewImageUrl || 'https://placehold.co/400x400/eeeeee/cccccc?text=Preview'" />
            </VAvatar>
            <VFileInput
              label="Pilih Gambar"
              accept="image/*"
              variant="outlined"
              density="compact"
              @change="onFileChange"
              prepend-icon="mdi-camera"
            />
             <p class="text-caption mt-2">Max 2MB. Format: JPG, PNG, GIF.</p>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Baris Bawah: Detail Harga & Stok -->
    <VCard class="mt-6">
       <VCardTitle class="pa-4 bg-grey-lighten-4">
          <span class="text-h5">Harga & Stok</span>
          <span class="text-body-2 text-medium-emphasis ml-2">- Untuk {{ activeWarehouseName }}</span>
       </VCardTitle>
       <VCardText>
          <VForm ref="refVFormDetails">
             <VRow>
                <VCol cols="12" md="6" lg="3">
                   <VTextField
                      v-model="productDetailData.item_code"
                      label="Kode SKU (Opsional)"
                      variant="outlined" density="compact"
                   />
                </VCol>
                 <VCol cols="12" md="6" lg="2">
                   <VTextField
                      v-model.number="productDetailData.current_stock"
                      label="Stok Awal" type="number"
                      :rules="[v => v >= 0 || 'Stok tidak boleh negatif']"
                      variant="outlined" density="compact"
                   />
                </VCol>
                <!-- PENAMBAHAN KOLOM STOCK ALERT -->
                <VCol cols="12" md="6" lg="2">
                   <VTextField
                      v-model.number="productDetailData.stock_alert"
                      label="Peringatan Stok" type="number"
                      :rules="[v => v >= 0 || 'Nilai tidak boleh negatif']"
                      variant="outlined" density="compact"
                   />
                </VCol>
                 <VCol cols="12" md="6" lg="2">
                   <VTextField
                      v-model.number="productDetailData.purchase_price"
                      label="Harga Beli" type="number" prefix="Rp"
                      :rules="[v => v >= 0 || 'Harga tidak boleh negatif']"
                      variant="outlined" density="compact"
                   />
                </VCol>
                 <VCol cols="12" md="6" lg="3">
                   <VTextField
                      v-model.number="productDetailData.sales_price"
                      label="Harga Jual" type="number" prefix="Rp"
                      :rules="[v => v > 0 || 'Harga harus lebih dari 0']"
                      variant="outlined" density="compact"
                   />
                </VCol>
             </VRow>
          </VForm>
       </VCardText>
    </VCard>

    <!-- Tombol Aksi Bawah -->
    <div class="d-flex mt-6">
        <VSpacer />
        <VBtn color="secondary" @click="cancel" variant="text" class="mr-2">Batal</VBtn>
        <VBtn color="primary" @click="save" variant="flat" :loading="isSaving">Simpan Produk</VBtn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '@/plugins/axios'
import type { VForm } from 'vuetify/components'

// State
const router = useRouter()
const route = useRoute()
const refVForm = ref<VForm>()
const refVFormDetails = ref<VForm>()
const isSaving = ref(false)

const categories = ref<any[]>([])
const brands = ref<any[]>([])
const units = ref<any[]>([])
const activeWarehouseName = ref('')
const previewImageUrl = ref<string | null>(null)

const productData = ref({
  name: '',
  description: '',
  category_id: null as number | null,
  brand_id: null as number | null,
  unit_id: null as number | null,
  photo: null as File | null,
});

const productDetailData = ref({
    item_code: '',
    purchase_price: 0,
    sales_price: 0,
    current_stock: 0,
    stock_alert: 0, // <-- Tambahkan state untuk stock_alert
});

// Computed
const productId = computed(() => route.params.id)
const isEditMode = computed(() => !!productId.value)
const formTitle = computed(() => (isEditMode.value ? 'Edit Data Produk' : 'Tambah Produk Baru'))

// API Calls
const fetchDropdownData = async () => {
  try {
    const [catRes, brandRes, unitRes] = await Promise.all([
      axios.get('/api/categories?all=true'),
      axios.get('/api/brands?all=true'),
      axios.get('/api/units?all=true'),
    ]);
    categories.value = catRes.data.data.data;
    brands.value = brandRes.data.data.data;
    units.value = unitRes.data.data.data;
  } catch (error) {
    console.error('Gagal mengambil data dropdown:', error);
  }
}

const fetchProduct = async () => {
    try {
        const { data } = await axios.get(`/api/products/${productId.value}`);
        const product = data.data;
        
        productData.value = {
            name: product.name,
            description: product.description,
            category_id: product.category?.id,
            brand_id: product.brand?.id,
            unit_id: product.unit?.id,
            photo: null,
        }

        const detail = product.details?.[0];
        if (detail) {
            productDetailData.value = {
                item_code: detail.item_code,
                purchase_price: detail.purchase_price,
                sales_price: detail.sales_price,
                current_stock: detail.current_stock,
                stock_alert: detail.stock_alert, // <-- Ambil data stock_alert saat edit
            }
        }
        previewImageUrl.value = product.image_url;
    } catch (error) {
        console.error('Gagal mengambil data produk:', error);
        router.push({ name: 'ProductsList' });
    }
}

// Lifecycle
onMounted(() => {
  fetchDropdownData();
  const warehouse = JSON.parse(localStorage.getItem('activeWarehouse') || '{}');
  activeWarehouseName.value = warehouse.name || 'Gudang Utama';

  if (isEditMode.value) {
    fetchProduct();
  }
});

// Actions
const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    productData.value.photo = target.files[0];
    // Buat URL preview untuk gambar yang baru dipilih
    previewImageUrl.value = URL.createObjectURL(target.files[0]);
  }
}

const cancel = () => {
  router.back();
}

const save = async () => {
  const { valid: form1Valid } = await refVForm.value!.validate()
  const { valid: form2Valid } = await refVFormDetails.value!.validate()
  if (!form1Valid || !form2Valid) return

  isSaving.value = true;
  
  const formData = new FormData();
  formData.append('name', productData.value.name);
  if (productData.value.description) formData.append('description', productData.value.description);
  if (productData.value.category_id) formData.append('category_id', String(productData.value.category_id));
  if (productData.value.brand_id) formData.append('brand_id', String(productData.value.brand_id));
  if (productData.value.unit_id) formData.append('unit_id', String(productData.value.unit_id));
  if (productData.value.photo) formData.append('photo', productData.value.photo);
  
  formData.append('item_code', productDetailData.value.item_code);
  formData.append('purchase_price', String(productDetailData.value.purchase_price));
  formData.append('sales_price', String(productDetailData.value.sales_price));
  formData.append('current_stock', String(productDetailData.value.current_stock));
  formData.append('stock_alert', String(productDetailData.value.stock_alert)); // <-- Kirim data stock_alert

  const config = {
      headers: {
          'Content-Type': 'multipart/form-data',
      }
  };

  try {
    if (isEditMode.value) {
      formData.append('_method', 'PUT');
      await axios.post(`/api/products/${productId.value}`, formData, config);
    } else {
      await axios.post('/api/products', formData, config);
    }
    router.push({ name: 'ProductsList' });
  } catch (error) {
    console.error('Gagal menyimpan data produk:', error);
  } finally {
    isSaving.value = false;
  }
}
</script>

