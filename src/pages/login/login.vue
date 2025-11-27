<template>
  <div class="login-page d-flex align-center justify-center">
    <VCard elevation="8" class="pa-8" max-width="400">
      <div class="text-center mb-6">
        <VAvatar size="64" class="mb-2" color="warning">
          <span class="text-h5">🐶</span>
        </VAvatar>
        <h2 class="text-h5 font-weight-bold">Welcome to Meowmart! 👋</h2>
        <p class="text-body-2 text-medium-emphasis">
          Please sign in to your account and start the adventure
        </p>
      </div>

      <!-- Form -->
      <VForm ref="refVForm" @submit.prevent="onSubmit">
        <VTextField
          v-model="email"
          label="Email"
          type="email"
          prepend-inner-icon="mdi-email"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          :error-messages="errors.email"
          required
        />

        <VTextField
          v-model="password"
          :type="isPasswordVisible ? 'text' : 'password'"
          label="Password"
          prepend-inner-icon="mdi-lock"
          :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="isPasswordVisible = !isPasswordVisible"
          variant="outlined"
          density="comfortable"
          class="mb-2"
          :error-messages="errors.password"
          required
        />

        <div class="d-flex align-center justify-space-between mb-4">
          <VCheckbox
            v-model="rememberMe"
            label="Remember me"
            density="compact"
            hide-details
          />
          <a href="#" class="text-primary text-body-2">Forgot Password?</a>
        </div>

        <VBtn
          type="submit"
          color="warning"
          block
          size="large"
          class="mb-4 text-white"
        >
          Sign In
        </VBtn>
      </VForm>

      <div class="text-center text-body-2">
        New on our platform?
        <a href="#" class="text-primary font-weight-medium">Create an account</a>
      </div>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { VForm } from 'vuetify/components'
import axios from '@/plugins/axios'
import { useRouter, useRoute } from 'vue-router'
import Dashboard from '../dashboard/dashboard.vue'

const refVForm = ref<VForm>()
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const isPasswordVisible = ref(false)
const errors = ref<Record<string, string | undefined>>({
  email: undefined,
  password: undefined,
})

const router = useRouter()
const route = useRoute()

// onMounted(() => {
//   if (localStorage.getItem('userData')) {
//     router.replace('/dashboard')
//   }
// })

const login = async () => {
  errors.value = { email: undefined, password: undefined };

  try {
    // Step 1: Get CSRF cookie
    await axios.get('/sanctum/csrf-cookie')

    // Step 2: Attempt login
    const loginResponse = await axios.post('/api/login', {
      email: email.value,
      password: password.value,
      remember: rememberMe.value,
    })

    // Destructure data from successful response, termasuk active_branch
    const { access_token, user, active_branch } = loginResponse.data

    // Store auth data in localStorage
    localStorage.setItem('userData', JSON.stringify(user))
    localStorage.setItem('accessToken', access_token)

    // Store the active branch for the session
    if (active_branch) {
        localStorage.setItem('activeBranch', JSON.stringify(active_branch)); // <-- Menggunakan key yang dikirim backend
    }

    // Redirect to dashboard
    await router.replace({ name: 'Dashboard' }) 

  } catch (e: any) {
    console.error("Login error response:", e.response);

    // Penanganan Error yang Lebih Spesifik dan Akurat
    if (e.response && e.response.status === 422) {
      const validationErrors = e.response.data.errors;
      if (validationErrors) {
        errors.value.email = validationErrors.email?.[0];
        errors.value.password = validationErrors.password?.[0];

        if (!errors.value.email && !errors.value.password) {
            errors.value.email = e.response.data.message;
        }
      } else {
        errors.value.email = e.response.data.message || 'An unknown validation error occurred.';
      }
    } else {
      errors.value.email = 'Could not connect to the server. Please try again later.';
    }
  }
}


const onSubmit = async () => {
  const isValid = await refVForm.value?.validate()
  if (isValid) login()
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background-color: #f9f9fb;
}

a {
  text-decoration: none;
}
</style>