// Supabase Configuration
// FabricAI Project

export const SUPABASE_URL = 'https://bxuhyovhezvijtwisibc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4dWh5b3ZoZXp2aWp0d2lzaWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTIzMTYsImV4cCI6MjA4NDQyODMxNn0.9EjqMgjbk2SwwVSCRjn1NZAGeAgaTlEbhvv7Ko2EnOk';

// Subscription Plans
export const PLANS = {
    free: {
        name: 'Free',
        price: 0,
        generations: 3,
        features: ['3 generazioni/mese', 'Qualità standard']
    },
    pro: {
        name: 'Pro',
        price: 9.99,
        priceId: 'price_pro_monthly', // Stripe price ID
        generations: 50,
        features: ['50 generazioni/mese', 'Alta qualità', 'Storico generazioni']
    },
    business: {
        name: 'Business',
        price: 29.99,
        priceId: 'price_business_monthly', // Stripe price ID
        generations: -1, // unlimited
        features: ['Generazioni illimitate', 'Massima qualità', 'Supporto prioritario', 'White-label']
    }
};
