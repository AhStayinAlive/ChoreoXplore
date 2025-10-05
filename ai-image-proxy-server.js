import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { InferenceClient } from '@huggingface/inference';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = 3002;

// Initialize Hugging Face client
const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
const hfClient = HF_TOKEN ? new InferenceClient(HF_TOKEN) : null;

console.log(`🤖 Hugging Face client initialized: ${hfClient ? 'With API token' : 'No API token (will use placeholders)'}`);

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// AI Image Generation endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'digital art', width = 512, height = 512 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required' 
      });
    }

    console.log(`🎨 Generating image with prompt: "${prompt}"`);

    // Try to use Hugging Face SDK with nscale provider
    if (hfClient) {
      try {
        console.log('🎨 Using Hugging Face SDK with nscale provider...');
        
        const image = await hfClient.textToImage({
          provider: "nscale",
          model: "stabilityai/stable-diffusion-xl-base-1.0",
          inputs: `${prompt}, ${style}, high quality, detailed`,
          parameters: { 
            num_inference_steps: 5,
            width: width,
            height: height
          }
        });

        console.log(`✅ Successfully generated image with HF SDK! Size: ${image.size} bytes`);
        
        // Convert Blob to Buffer to ensure proper image format
        const imageBuffer = Buffer.from(await image.arrayBuffer());
        
        // Set appropriate headers for image response
        res.set({
          'Content-Type': 'image/png',
          'Content-Length': imageBuffer.length,
          'Cache-Control': 'no-cache'
        });
        
        return res.send(imageBuffer);
        
      } catch (error) {
        console.error('❌ HF SDK failed:', error.message);
        throw error; // Don't fall back to placeholders
      }
    } else {
      throw new Error('No HF API token available');
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'ai-image-proxy-server',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'AI Image Proxy Server is working!',
    test: 'This is a test response',
    timestamp: new Date().toISOString()
  });
});

// Enhanced placeholder image generation
async function createEnhancedPlaceholder(prompt, style, width, height) {
  const { createCanvas } = await import('canvas');
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Extract colors from prompt
  const colorMatches = prompt.match(/#[0-9A-Fa-f]{6}/g);
  const colors = colorMatches || ['#FF6B6B', '#4ECDC4', '#FFE66D'];
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, colors[1] || colors[0]);
  gradient.addColorStop(1, colors[2] || colors[0]);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add geometric shapes based on prompt
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  
  if (prompt.includes('geometric')) {
    // Draw geometric patterns
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.rect(50 + i * 100, 100 + i * 50, 80, 80);
      ctx.fill();
    }
  } else if (prompt.includes('flowing') || prompt.includes('curves')) {
    // Draw flowing curves
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    for (let i = 0; i < width; i += 20) {
      const y = height / 2 + Math.sin(i * 0.02) * 50;
      ctx.lineTo(i, y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (prompt.includes('abstract')) {
    // Draw abstract shapes
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 50 + 20,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  } else {
    // Default: circles
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(
        100 + i * 80,
        height / 2,
        30 + i * 5,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  }
  
  // Add text overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AI Generated Asset', width / 2, height - 20);
  
  return canvas.toBuffer('image/png');
}

// Start server
app.listen(PORT, () => {
  console.log(`🎨 AI Image Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🖼️  Image generation: http://localhost:${PORT}/api/generate-image`);
  if (!HF_TOKEN) {
    console.log(`🔑 To enable real AI generation, set HF_TOKEN environment variable`);
    console.log(`   Get your free token at: https://huggingface.co/settings/tokens`);
  }
});

export default app;
