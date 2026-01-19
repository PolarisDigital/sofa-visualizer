// Supabase Configuration
// FabricAI Project

export const SUPABASE_URL = 'https://bxuhyovhezvijtwisibc.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_AKFSbO2vt3WEyZW9RZae1Q_E3j-Zb3n';

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
