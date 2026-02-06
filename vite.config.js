import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    server: {
        port: 3000,
        open: true
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'login.html'),
                admin: resolve(__dirname, 'admin.html'),
                users: resolve(__dirname, 'users.html'),
                superadmin: resolve(__dirname, 'superadmin.html'),
                privacy: resolve(__dirname, 'privacy.html')
            }
        }
    }
})
