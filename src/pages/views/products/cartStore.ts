import { defineStore } from 'pinia'
import { ref, computed } from 'vue'


interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  stock: number;
  is_service?: boolean;
  registration_id?: number;
}

// Buat 'useCartStore'
export const useCartStore = defineStore('cart', () => {
 
  const items = ref<CartItem[]>([])

  
  const cartTotalItems = computed(() => items.value.reduce((total, item) => total + item.quantity, 0))
  const cartTotalPrice = computed(() => items.value.reduce((total, item) => total + (item.price * item.quantity), 0))
  const cartLength = computed(() => items.value.length)

  
  /**
   * Menghapus semua isi keranjang
   */
  function clearCart() {
    items.value = []
  }

  /**
   * Menambah item baru ke keranjang (bisa produk atau layanan)
   * Mengembalikan boolean untuk status sukses (true/false)
   */
  function addItem(item: CartItem): boolean {
    const existingItem = items.value.find(i => i.id === item.id)

    if (existingItem) {
      if (existingItem.quantity < item.stock) {
        existingItem.quantity++
      } else {
        // Handle stok tidak cukup
        console.warn('Stok tidak mencukupi!')
        return false
      }
    } else {
      if (item.stock > 0) {
        const newItem = { ...item, quantity: 1 };
        items.value = [...items.value, newItem]; 
      } else {
        console.error('Produk habis!')
        return false
      }
    }
    return true
  }

  /**
   * Mengubah jumlah item di keranjang
   */
  function updateQuantity(itemId: number | string, amount: number) {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return

    const newQuantity = item.quantity + amount

    if (newQuantity <= 0) {
      items.value = items.value.filter(i => i.id !== itemId)
    } else if (newQuantity <= item.stock) {
      item.quantity = newQuantity
    } else {
      // Stok tidak cukup
      console.warn('Stok tidak mencukupi!')
    }
  }

  return {
    items,
    cartTotalItems,
    cartTotalPrice,
    cartLength,
    clearCart,
    addItem,
    updateQuantity,
  }
})

