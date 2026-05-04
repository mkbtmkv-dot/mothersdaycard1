import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "../../../attached_assets");

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const CAFE_NAME = "Aaiji Heritage";

// ─── Aaiji Heritage Coordinate Map (Figma source-of-truth, 1080×1920) ────────
//
// left = X-axis pixel address from the LEFT edge of the canvas.
// top  = Y-axis pixel address from the TOP  edge of the canvas.
//
// For rotation:0 frames these values are passed directly to Sharp .composite()
// with ZERO adjustment — the photo top-left lands at exactly (left, top).
//
// Only frames with rotation≠0 use the center-preserving bbox correction (Sharp
// expands the canvas when rotating, so we re-anchor to keep the visual centre
// at the Figma anchor point).
//
const FRAMES = [
  {
    id: "1",
    name: "Floral Polaroid",
    description: "A classic polaroid with delicate floral accents",
    previewImage: "/api/cards/preview/1",
    dualSlot: false,
    backgroundFile: "image_1_1777829106637.png",
    slots: [
      // X:284  Y:583  W:514  H:690  rot:0°
      { width: 514, height: 690, top: 583, left: 284, rotation: 0, strategy: "attention" as const },
    ],
  },
  {
    id: "2",
    name: "Scrapbook Memory",
    description: "A vintage scrapbook-style with pressed flowers",
    previewImage: "/api/cards/preview/2",
    dualSlot: false,
    backgroundFile: "image_2_1777829106637.png",
    slots: [
      // X:215  Y:442  W:650  H:866  rot:0°
      { width: 650, height: 866, top: 442, left: 215, rotation: 0, strategy: "attention" as const },
    ],
  },
  {
    id: "3",
    name: "Abstract Watercolor",
    description: "Soft watercolor splashes with a bright centred photo window",
    previewImage: "/api/cards/preview/3",
    dualSlot: false,
    backgroundFile: "image_3_1777893888259.png",
    textY: 1780,
    slots: [
      // X:247  Y:281  W:600  H:833  rot:0°
      { width: 600, height: 833, top: 281, left: 247, rotation: 0, strategy: "attention" as const },
    ],
  },
  {
    id: "4",
    name: "Floral Letter",
    description: "A golden-bordered letter card with a soft floral photo slot",
    previewImage: "/api/cards/preview/4",
    dualSlot: false,
    backgroundFile: "image_5_1777893888259.png",
    textY: 1100,
    slots: [
      // left(X):208  top(Y):117  W:673  H:922  rot:0°
      { width: 673, height: 922, top: 117, left: 208, rotation: 0, strategy: "attention" as const },
    ],
  },
  {
    id: "5",
    name: "Vintage Letter",
    description: "A love-letter frame draped in pressed botanical blooms",
    previewImage: "/api/cards/preview/5",
    dualSlot: false,
    backgroundFile: "image_4_1777893888259.png",
    textY: 1780,
    slots: [
      // left(X):269  top(Y):522  W:589  H:889  rot:0°
      { width: 589, height: 889, top: 522, left: 269, rotation: 0, strategy: "attention" as const },
    ],
  },
];

// ─── Photo Slot Pipeline ──────────────────────────────────────────────────────
// Returns a Sharp OverlayOptions object ready for .composite().
// For rotation:0 frames the returned { left, top } are VERBATIM from the slot
// config — no centering, no gravity, no adjustment of any kind.
async function processPhotoSlot(
  inputBuffer: Buffer,
  slot: {
    width: number;
    height: number;
    top: number;
    left: number;
    rotation: number;
    strategy: "attention" | "entropy";
  }
): Promise<sharp.OverlayOptions> {
  // Step 1 — EXIF orientation: straighten before any geometry
  const oriented = await sharp(inputBuffer).rotate().toBuffer();

  // Step 2 — Strict cover fill to exact slot dimensions.
  // position uses the STRING values 'attention' / 'entropy' directly — NOT
  // sharp.strategy.attention (an integer) which bypasses the string-based
  // crop path and can produce unexpected results.
  const filled = await sharp(oriented)
    .resize(slot.width, slot.height, {
      fit: "cover",
      position: slot.strategy,   // 'attention' | 'entropy'  (string, documented API)
    })
    .toBuffer();

  // Step 3 — Heritage colour grading
  const polished = await sharp(filled)
    .modulate({ saturation: 1.15, brightness: 1.05 })
    .toBuffer();

  // Step 4 — 88% opacity via raw alpha-channel walk (Sharp has no opacity() call)
  const { data: rawData, info: rawInfo } = await sharp(polished)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < rawData.length; i += 4) {
    rawData[i] = Math.round(rawData[i] * 0.88);
  }
  let photoBuffer = await sharp(rawData, {
    raw: { width: rawInfo.width, height: rawInfo.height, channels: 4 },
  }).png().toBuffer();

  // Step 5 — Placement
  if (slot.rotation === 0) {
    // Straight slot — absolute top-left address, zero adjustment.
    // Sharp .composite() left/top are pixel offsets from the TOP-LEFT of the
    // base image. left=X-axis column, top=Y-axis row.
    console.log(
      `[composite] straight  left=${slot.left}  top=${slot.top}  ` +
      `size=${slot.width}x${slot.height}`
    );
    return { input: photoBuffer, left: slot.left, top: slot.top };
  }

  // Rotated slot — Sharp.rotate() expands the bounding box; re-anchor the
  // enlarged buffer so its visual centre stays at the Figma anchor centre.
  photoBuffer = await sharp(photoBuffer)
    .rotate(slot.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const rad      = Math.abs((slot.rotation * Math.PI) / 180);
  const rotatedW = Math.ceil(slot.width  * Math.cos(rad) + slot.height * Math.sin(rad));
  const rotatedH = Math.ceil(slot.width  * Math.sin(rad) + slot.height * Math.cos(rad));
  const placementLeft = Math.round(slot.left + slot.width  / 2 - rotatedW / 2);
  const placementTop  = Math.round(slot.top  + slot.height / 2 - rotatedH / 2);

  console.log(
    `[composite] rotated ${slot.rotation}°  bbox=${rotatedW}x${rotatedH}  ` +
    `left=${placementLeft}  top=${placementTop}`
  );
  return { input: photoBuffer, left: placementLeft, top: placementTop };
}

// ─── Name SVG ────────────────────────────────────────────────────────────────
function buildNameSvg(name: string, textY = 1780): Buffer {
  const svg = `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <text
      x="${CANVAS_WIDTH / 2}"
      y="${textY}"
      font-family="Georgia, 'Times New Roman', serif"
      font-size="52"
      font-style="italic"
      text-anchor="middle"
      fill="#4A3728"
      opacity="0.92"
    >${escapeXml(name)}</text>
    <text
      x="60"
      y="1870"
      font-family="'Helvetica Neue', Arial, sans-serif"
      font-size="22"
      font-weight="300"
      letter-spacing="3"
      text-anchor="start"
      fill="#4A3728"
      opacity="0.5"
    >${escapeXml(CAFE_NAME)}</text>
  </svg>`;
  return Buffer.from(svg);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get("/cards/frames", (_req, res) => {
  res.json(
    FRAMES.map(({ id, name, description, previewImage, dualSlot }) => ({
      id, name, description, previewImage, dualSlot,
    }))
  );
});

router.get("/cards/preview/:id", (req, res) => {
  const frame = FRAMES.find((f) => f.id === req.params.id);
  if (!frame) {
    res.status(404).json({ error: "not_found", message: "Frame not found" });
    return;
  }
  res.sendFile(path.join(ASSETS_DIR, frame.backgroundFile));
});

// POST /api/cards/generate
//
// Assembly order (bottom → top):
//   Layer 1 — Base: JPEG template scaled to 1080×1920
//   Layer 2 — Top:  Processed & slot-rotated user photo(s)
//   Layer 3 — Overlay: Transparent SVG with mother's name (y=1780)
//
router.post("/cards/generate", upload.single("photo"), async (req, res) => {
  try {
    const file = req.file;
    const motherName = (req.body.motherName as string)?.trim() ?? "";
    const frameId = req.body.frameId as string;

    if (!file) {
      res.status(400).json({ error: "bad_request", message: "No photo uploaded" });
      return;
    }

    const frame = FRAMES.find((f) => f.id === frameId);
    if (!frame) {
      res.status(400).json({ error: "bad_request", message: "Invalid frame ID" });
      return;
    }

    console.log(`[generate] frame=${frameId}  name="${motherName}"  fileSize=${file.size}`);

    // ── Layer 1: Template JPEG scaled to canvas ──────────────────────────────
    const templatePath = path.join(ASSETS_DIR, frame.backgroundFile);
    const base = await sharp(templatePath)
      .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: "fill" })
      .png()
      .toBuffer();

    // ── Layer 2: Processed user photo(s) composited on top of template ───────
    const photoOverlays: sharp.OverlayOptions[] = [];
    for (const slot of frame.slots) {
      photoOverlays.push(await processPhotoSlot(file.buffer, slot));
    }

    const withPhotos = await sharp(base).composite(photoOverlays).png().toBuffer();

    // ── Layer 3: Transparent SVG name overlay (topmost) ──────────────────────
    const finalComposites: sharp.OverlayOptions[] = [];
    if (motherName) {
      finalComposites.push({ input: buildNameSvg(motherName, frame.textY ?? 1780), top: 0, left: 0 });
    }

    const result =
      finalComposites.length > 0
        ? await sharp(withPhotos).composite(finalComposites).png().toBuffer()
        : withPhotos;

    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", 'attachment; filename="aaiji-card.png"');
    res.send(result);
  } catch (err) {
    req.log.error({ err }, "Card generation failed");
    res.status(500).json({ error: "server_error", message: "Failed to generate card" });
  }
});

export default router;
