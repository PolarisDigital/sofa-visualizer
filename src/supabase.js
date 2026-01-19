import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth functions
export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });
    if (error) throw error;
    return data;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

// Profile functions
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) throw error;
    return data;
}

export async function updateGenerationsUsed(userId) {
    const { data, error } = await supabase.rpc('increment_generations', {
        user_id: userId
    });
    if (error) throw error;
    return data;
}

// Check if user can generate (based on plan limits)
export async function canGenerate(userId) {
    const profile = await getProfile(userId);
    const plan = profile?.plan || 'free';

    // Business plan has unlimited
    if (plan === 'business') return true;

    const limits = { free: 3, pro: 50 };
    const limit = limits[plan] || 3;

    return profile.generations_used < limit;
}

// Get remaining generations
export async function getRemainingGenerations(userId) {
    const profile = await getProfile(userId);
    const plan = profile?.plan || 'free';

    if (plan === 'business') return -1; // unlimited

    const limits = { free: 3, pro: 50 };
    const limit = limits[plan] || 3;

    return Math.max(0, limit - (profile?.generations_used || 0));
}
