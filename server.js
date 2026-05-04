const express = require('express');
const sharp = require('sharp');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BRAND_NAME = "MomentsforMaa"; 

const cardConfigs = {
  "1": { file: 'image_1.png', left: 284, top: 583, width: 514, height: 690 },
  "2": { file: 'image_2.png', left: 215, top: 442, width: 650, height: 866 },
  "3": { file: 'image_3.png', left: 247, top: 281, width: 600, height: 833 },
  "4": { file: 'image_4.png', left: 208, top: 117, width: 673, height: 922 },
  "5": { file: 'image_5.png', left: 269, top: 522, width: 589, height: 889 }
};

app.post('/api/generate', async (req, res) => {
  const { cardId, userName, userPhotoUrl } = req.body;

  if (!cardId || !cardConfigs[cardId]) {
    return res.status(400).json({ error: "Invalid Card ID" });
  }

  try {
    const config = cardConfigs[cardId];
    // On Vercel, __dirname points to the function directory
    const framePath = path.join(process.cwd(), 'frames', config.file); 
    
    const photoResponse = await fetch(userPhotoUrl);
    if (!photoResponse.ok) throw new Error("Failed to fetch user photo");
    const photoBuffer = await photoResponse.arrayBuffer();
    
    const processedPhoto = await sharp(Buffer.from(photoBuffer))
      .resize(config.width, config.height, { fit: 'cover', position: 'attention' })
      .ensureAlpha(0.88) 
      .toBuffer();

    const svgOverlay = Buffer.from(`
      <svg width="1080" height="1920">
        <text x="540" y="1780" font-family="Arial" font-size="60" fill="#4A3728" text-anchor="middle">${userName}</text>
        <text x="60" y="1870" font-family="sans-serif" font-size="22" fill="#4A3728" fill-opacity="0.5" style="letter-spacing: 3px;">${BRAND_NAME}</text>
      </svg>
    `);

    const finalImage = await sharp(framePath)
      .composite([
        { input: processedPhoto, left: config.left, top: config.top },
        { input: svgOverlay, top: 0, left: 0 }
      ])
      .jpeg({ quality: 90 }) // Slightly compressed for faster loading
      .toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour for performance
    return res.send(finalImage);

  } catch (error) {
    console.error("Vercel Error:", error.message);
    return res.status(500).json({ error: "Image generation failed" });
  }
});

app.get('/', (req, res) => {
  res.send(`<h1>🌸 ${BRAND_NAME} API</h1><p>Production server is live.</p>`);
});

// Important for Vercel: Export the app
module.exports = app;

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Dev server on ${PORT}`));
}