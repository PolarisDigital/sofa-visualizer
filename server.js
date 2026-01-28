import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS per permettere richieste dal frontend
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Sofa Visualizer API' });
});

// Gemini image editing endpoint - V2: Dual Image (Sofa + Fabric Texture)
app.post('/api/gemini/edit', async (req, res) => {
    const { sofaImageBase64, fabricImageBase64, apiKey, outputMode } = req.body;

    // Use provided API key or environment variable
    const googleApiKey = apiKey || process.env.GOOGLE_API_KEY;

    if (!googleApiKey) {
        return res.status(400).json({
            success: false,
            error: 'API key required. Set GOOGLE_API_KEY or pass apiKey in request.'
        });
    }

    if (!sofaImageBase64 || !fabricImageBase64) {
        return res.status(400).json({
            success: false,
            error: 'Both sofa image and fabric texture image are required.'
        });
    }

    try {
        console.log('Processing dual images with Gemini 3 Pro... Mode:', outputMode || 'ambientato');

        const genAI = new GoogleGenerativeAI(googleApiKey);

        // Use Gemini 2.0 Flash Exp - More stable
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation",
            generationConfig: {
                responseModalities: ["image", "text"],
            }
        });

        // Build prompt based on output mode
        let editPrompt;

        if (outputMode === 'scontornato') {
            // Isolated sofa on neutral background with custom texture
            editPrompt = `You are an expert product photographer and digital compositor.

I am providing you TWO images:
1. **IMAGE 1 (First image)**: A photograph of a SOFA/COUCH - this is the subject
2. **IMAGE 2 (Second image)**: A fabric/textile TEXTURE sample - this is the material to apply

YOUR TASK:
1. EXTRACT the sofa from IMAGE 1 (remove all background)
2. APPLY the fabric texture from IMAGE 2 onto the sofa upholstery
3. PLACE the result on a clean, professional studio white/gray gradient background

CRITICAL REQUIREMENTS:
- The fabric texture must wrap realistically around the sofa's 3D form
- Match the lighting direction from the original sofa photo
- Preserve all cushion shapes, folds, and contours
- Add realistic self-shadowing in the creases and folds
- Include a soft drop shadow under the sofa
- Output quality: 8K, photorealistic, sharp focus, professional catalogue style

Generate the final image.`;
        } else {
            // Keep original background (ambientato) with custom texture
            editPrompt = `You are an expert interior designer and digital compositor specializing in photorealistic visualization.

I am providing you TWO images:
1. **IMAGE 1 (First image)**: A photograph of a SOFA/COUCH in a room setting - this is the subject
2. **IMAGE 2 (Second image)**: A fabric/textile TEXTURE sample - this is the material to apply

YOUR TASK:
- REPLACE the current upholstery of the sofa in IMAGE 1 with the fabric texture from IMAGE 2
- Keep EVERYTHING else in the scene EXACTLY the same (room, walls, floor, other furniture, lighting)

CRITICAL REQUIREMENTS:
- The fabric texture must wrap realistically following the sofa's 3D geometry
- Preserve the original lighting, shadows, and ambient occlusion
- Match the color temperature and exposure of the original scene
- Maintain all creases, folds, and cushion shapes
- The texture should show realistic material properties (weave, grain, sheen appropriate to the fabric type)
- Output quality: 8K UHD, raw photo style, sharp focus, mathematically precise texture mapping

Generate the edited image maintaining photorealistic quality.`;
        }

        // Send BOTH images to Gemini with retry logic
        let result;
        let lastError;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}/${maxRetries}...`);
                result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: sofaImageBase64
                        }
                    },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: fabricImageBase64
                        }
                    },
                    editPrompt
                ]);
                break; // Success, exit retry loop
            } catch (retryError) {
                lastError = retryError;
                console.log(`Attempt ${attempt} failed: ${retryError.message}`);
                if (attempt < maxRetries && retryError.message.includes('503')) {
                    // Wait before retry (exponential backoff)
                    const waitTime = attempt * 2000;
                    console.log(`Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else if (attempt === maxRetries) {
                    throw lastError;
                }
            }
        }

        const response = await result.response;

        // Check if there's an image in the response
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    console.log('Image generated successfully');
                    res.json({
                        success: true,
                        image: part.inlineData.data
                    });
                    return;
                }
            }
        }

        // If no image found
        const text = response.text();
        console.log('No image in response:', text);
        res.status(400).json({
            success: false,
            error: 'No image generated',
            message: text
        });

    } catch (error) {
        console.error('Gemini API error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// USER MANAGEMENT ENDPOINTS (Admin only)
// ============================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin client with service role key (full access)
const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

// GET /api/admin/users - List all users
app.get('/api/admin/users', async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: 'Admin client not configured' });
    }

    try {
        // Get users from auth
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        // Get profiles
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('*');
        if (profilesError) throw profilesError;

        // Merge auth users with profiles
        const users = authUsers.users.map(user => {
            const profile = profiles?.find(p => p.id === user.id);
            return {
                id: user.id,
                email: user.email,
                role: profile?.role || 'venditore',
                full_name: profile?.full_name || '',
                created_at: user.created_at,
                last_sign_in: user.last_sign_in_at
            };
        });

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error listing users:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/users - Create new user
app.post('/api/admin/users', async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: 'Admin client not configured' });
    }

    const { email, password, role, full_name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    try {
        // Create user in auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true // Auto-confirm email
        });

        if (authError) throw authError;

        // Update profile with role and name
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email: email,
                role: role || 'venditore',
                full_name: full_name || ''
            });

        if (profileError) throw profileError;

        res.json({
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                role: role || 'venditore'
            }
        });
    } catch (error) {
        console.error('Error creating user:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/admin/users/:id - Delete user
app.delete('/api/admin/users/:id', async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: 'Admin client not configured' });
    }

    const { id } = req.params;

    try {
        // Delete from auth (profile will cascade delete)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/admin/users/:id/role - Update user role
app.put('/api/admin/users/:id/role', async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: 'Admin client not configured' });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'venditore'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Valid role required (admin or venditore)' });
    }

    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ role })
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating role:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/admin/users/:id/password - Change user password
app.put('/api/admin/users/:id/password', async (req, res) => {
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, error: 'Admin client not configured' });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
            password: password
        });

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating password:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Sofa Visualizer API running on port ${PORT}`);
    console.log(`   POST /api/gemini/edit - Image editing with Gemini`);
    console.log(`   GET  /api/admin/users - List users`);
    console.log(`   POST /api/admin/users - Create user`);
    console.log(`   DELETE /api/admin/users/:id - Delete user`);
    console.log(`   PUT /api/admin/users/:id/role - Update role`);
    console.log(`   PUT /api/admin/users/:id/password - Change password`);
});
