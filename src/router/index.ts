// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/pages/login/login.vue'
import Dashboard from '@/pages/dashboard/dashboard.vue'
import PetsView from '@/pages/views/pets/petsView.vue' 
import CustomersView from '@/pages/views/customers/customersView.vue' 
import StaffView from '@/pages/views/pegawai/staffView.vue' 
import KandangsView from '@/pages/views/kandang/kandangView.vue' 
import productView from '@/pages/views/products/productView.vue'
import addProduct from '@/pages/views/products/addProduct.vue'
import productList from '@/pages/views/products/productList.vue'
import CategoryList from '@/pages/views/category/categoryList.vue'
import BrandList from '@/pages/views/brands/brandList.vue'
import RegistrationList from '@/pages/views/registration/registrationList.vue'
import AddRegistration from '@/pages/views/registration/addRegistration.vue'
import PaymentList from '@/pages/views/payment/penjualanView.vue'
import PembayaranMasukView from '@/pages/views/payment/PembayaranMasukView.vue'
import PetHotelView from '@/pages/views/hotel/PetHotelView.vue'
import EditProduct from '@/pages/views/products/editProduct.vue'
import AddStaffView from '@/pages/views/pegawai/addStaffView.vue'
import Purchases from '@/pages/views/Stok/purchases.vue'
import AddPurchases from '@/pages/views/Stok/addPurchases.vue'
import ServiceList from '@/pages/views/service/serviceList.vue'
import PembayaranKeluarView from '@/pages/views/payment/PembayaranKeluarView.vue'


const routes = [

// login
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      layout: 'blank' 
    }
  },

// dashboard
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      layout: 'default' 
    }
  },

  // registrations
  {
    path: '/registrations', 
    name: 'RegistrationList', 
    component: RegistrationList,
    meta: {
      layout: 'default' 
    }
  },

  // add registrations
  {
    path: '/addRegistartions', 
    name: 'add-registrations', 
    component: AddRegistration, 
    meta: {
      layout: 'default' 
    }
  },

// pets
  {
    path: '/pets',
    name: 'pets-management',
    component: PetsView,
    meta: {
      layout: 'default' 
    }
  },

  // pet hotel
  {
    path: '/petHotel',
    name: 'pet-hotel-management',
    component: PetHotelView,
    meta: {
      layout: 'default' 
    }
  },

  // view purchases
  {
    path: '/purchases',
    name: 'purchases-management',
    component: Purchases,
    meta: {
      layout: 'default' 
    }
  },

  // add purchases
  {
    path: '/addPurchases',
    name: 'add-purchases',
    component: AddPurchases,
    meta: {
      layout: 'default' 
    }
  },

  // view products
  {
    path: '/products',
    name: 'products-management',
    component: productView,
    meta: {
      layout: 'default' 
    }
  },

  // products list
  {
    path: '/listProducts',
    name: 'products-list',
    component: productList,
    meta: {
      layout: 'default' 
    }
  },

  // add products
  {
    path: '/addProducts',
    name: 'add-products',
    component: addProduct,
    meta: {
      layout: 'default' 
    }
  },

  // Contoh di dalam array routes
    {
      path: '/products/edit/:id',
      name: 'ProductEdit',
      component: EditProduct,
      meta: { 
        layout: 'default' 
      }
    },

  // category list
  {
    path: '/listCategory',
    name: 'category-list',
    component: CategoryList,
    meta: {
      layout: 'default' 
    }
  },

  // brand list
  {
    path: '/listbrand',
    name: 'brand-list',
    component: BrandList,
    meta: {
      layout: 'default' 
    }
  },

  // kandang
  {
    path: '/kandangs',
    name: 'kandangs-management',
    component: KandangsView,
    meta: { layout: 'default' }
  },
  
// customers
  {
    path: '/customers',
    name: 'customers-management',
    component: CustomersView,
    meta: {
      layout: 'default' 
    }
  },

  // Penjualan
  {
    path: '/payment',
    name: 'payment-management',
    component: PaymentList,
    meta: {
      layout: 'default' 
    }
  },

  // pemasukan
  {
    path: '/Pemasukan',
    name: 'pemasukan-management',
    component: PembayaranMasukView,
    meta: {
      layout: 'default' 
    }
  },

  // Pembayaran Keluar
  {
    path: '/PembayaranKeluar',
    name: 'pembayaranKeluar-management',
    component: PembayaranKeluarView,
    meta: {
      layout: 'default' 
    }
  },

  // service
    {
    path: '/service',
    name: 'service-management',
    component: ServiceList,
    meta: { layout: 'default' }
  },

// staff
    {
    path: '/staff',
    name: 'staff-management',
    component: StaffView,
    meta: { layout: 'default' }
  },

  // add staff
    {
    path: '/addStaff',
    name: 'addStaff-management',
    component: AddStaffView,
    meta: { layout: 'default' }
  },

// dashboard
  {
    path: '/',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router