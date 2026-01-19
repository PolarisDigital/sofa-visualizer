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
            editPrompt = `You are an expert photo editor and product photographer.

I have an image of a sofa/couch. I need you to:
1. ISOLATE the sofa from the background (remove the background completely)
2. Place the sofa on a clean, neutral LIGHT GRAY studio background (#E5E5E5 or similar)
3. Change the sofa upholstery: ${prompt}

CRITICAL REQUIREMENTS:
- Remove ALL background elements - room, walls, floor, other furniture
- Place sofa on a clean, seamless light gray gradient studio background
- Keep the EXACT same sofa shape, design and proportions
- Change only the fabric texture and color as specified
- Add soft, professional studio lighting
- Add subtle soft shadow under the sofa for realism
- OUTPUT MUST BE HIGH RESOLUTION and photorealistic quality
- The result should look like a professional product photo for e-commerce

Generate the edited image at the highest possible quality.`;
        } else {
            // Keep original background (ambientato)
            editPrompt = `You are an expert interior designer and professional photo editor.

I have an image of a sofa/couch. EDIT this image to change ONLY the upholstery/fabric of the sofa.

${prompt}

CRITICAL REQUIREMENTS:
- Keep the EXACT same sofa shape, design and dimensions
- Keep the EXACT same room/background and camera angle
- Keep all other furniture and objects unchanged
- Only change the fabric texture and color of the sofa
- OUTPUT MUST BE HIGH RESOLUTION and photorealistic quality
- Maintain proper lighting, shadows and reflections on the new fabric
- The fabric should have realistic texture detail
- Match the lighting conditions of the original photo
- Keep all fine details sharp and clear

Generate the edited image at the highest possible quality.`;
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
                        image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
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
    console.log(`🚀 Sofa Visualizer API running on port ${PORT}`);
    console.log(`   POST /api/gemini/edit - Image editing with Gemini`);
});
