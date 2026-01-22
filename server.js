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

// Gemini image editing endpoint
app.post('/api/gemini/edit', async (req, res) => {
    const { imageBase64, prompt, apiKey, outputMode } = req.body;

    // Use provided API key or environment variable
    const googleApiKey = apiKey || process.env.GOOGLE_API_KEY;

    if (!googleApiKey) {
        return res.status(400).json({
            success: false,
            error: 'API key required. Set GOOGLE_API_KEY or pass apiKey in request.'
        });
    }

    try {
        console.log('Processing image with Gemini... Mode:', outputMode || 'ambientato');

        const genAI = new GoogleGenerativeAI(googleApiKey);

        // Use Gemini 2.0 Flash for image editing
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                responseModalities: ["image", "text"],
            }
        });

        // Build prompt based on output mode
        let editPrompt;

        if (outputMode === 'scontornato') {
            // Isolated sofa on neutral background
            editPrompt = `You are an expert product photographer specializing in e-commerce visualization.

I have an image of a sofa/couch. I need you to:
1. ISOLATE the sofa (remove background).
2. PLACE it on a clean, professional Studio White/Gray background.
3. RETIXTURE the sofa with: ${prompt}

CRITICAL EXECUTION GUIDELINES:
- **EXTREME DETAIL**: The fabric texture must be sharp and visible (macro weave, grain).
- **REALISM**: Add realistic self-shadowing and ambient occlusion in the folds.
- **LIGHTING**: Soft, professional studio lighting from the top-left.
- **SHADOW**: Add a realistic drop shadow under the sofa on the floor.
- **QUALITY**: 8K, Raw Photo, Sharp Focus. No artifacts.

Generate the final image as a high-end catalogue photo.`;
        } else {
            // Keep original background (ambientato)
            editPrompt = `You are an expert interior designer and professional photo editor specializing in ultra-realistic product visualization.

I have an image of a sofa/couch. EDIT this image to change ONLY the upholstery/fabric of the sofa.

TARGET FABRIC: ${prompt}

CRITICAL EXECUTION GUIDELINES:
1. **ULTRA-REALISTIC TEXTURE**: The fabric must look mathematically precise and physically accurate.
   - Visible weave structure and grain (macro details).
   - Realistic minor imperfections, wrinkles, and folds where the fabric wraps.
   - Correct light interaction (specularity, roughness, sheen) for the specific material (e.g., velvet absorbs light, leather reflects it).

2. **PHOTOGRAPHY STANDARDS**:
   - 8K UHD Resolution quality.
   - Sharp focus on the sofa texture.
   - Raw photo style (no cartoon/render effect).
   - Perfect color grading matching the original scene.

3. **SCENE INTEGRATION**:
   - Keep the EXACT same room/background and camera angle.
   - Keep all other furniture and objects unchanged.
   - Maintain proper lighting, cast shadows, and ambient occlusion.

Generate the result as if shot with a high-end Hasselblad camera.`;
        }

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64
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
                        image: part.inlineData.data  // Return only base64, not full data URL
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
