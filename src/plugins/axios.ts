import axios from 'axios'

const instance = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
})

instance.interceptors.request.use((config) => {
  const token = getCookie('XSRF-TOKEN')
  if (token) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token)
  }
  return config
})

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) return match[2]
  return null
}

export default instance
