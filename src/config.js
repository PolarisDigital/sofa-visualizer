// Supabase Configuration
// Replace these values with your Supabase project credentials

export const SUPABASE_URL = 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

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
