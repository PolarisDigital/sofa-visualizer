import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS per permettere richieste dal frontend
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
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

        // Use Gemini 3 Pro Image Preview - Best quality for image generation
        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-image-preview",
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

        // Send BOTH images to Gemini
        const result = await model.generateContent([
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

app.listen(PORT, () => {
    console.log(`🚀 Sofa Visualizer API running on port ${PORT} (v2.0 Flash Stable)`);
    console.log(`   POST /api/gemini/edit - Image editing with Gemini`);
});
