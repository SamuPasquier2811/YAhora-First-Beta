import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false, // No detecta sesión en URL
        storageKey: 'supabase-admin-non-persistent', // Clave de almacenamiento única
        storage: { // Usa un almacenamiento "dummy" que no guarde nada
        getItem: (key) => null,
        setItem: (key, value) => {},
        removeItem: (key) => {}
        }
    }
})