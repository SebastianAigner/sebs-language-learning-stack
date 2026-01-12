import express, { Request, Response } from 'express';
import cors from 'cors';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
interface Config {
  port: number;
  provider: 'elevenlabs' | 'azure';
  // ElevenLabs settings
  voiceId: string;
  model: string;
  // Azure settings
  azureRegion: string;
  azureVoice: string;
  // Common settings
  cacheDir: string;
  maxTextLength: number;
}

const CONFIG: Config = {
  port: Number(process.env.TTS_SERVER_PORT || process.env.PORT) || 5065,
  provider: (process.env.TTS_PROVIDER as 'elevenlabs' | 'azure') || 'azure',
  // ElevenLabs settings
  voiceId: process.env.VOICE_ID || '3JDquces8E8bkmvbh6Bc',
  model: process.env.MODEL || 'eleven_flash_v2_5',
  // Azure settings
  azureRegion: process.env.AZURE_REGION || 'swedencentral',
  azureVoice: process.env.AZURE_VOICE || 'ja-JP-Nanami:DragonHDLatestNeural',
  // Common settings
  cacheDir: join(__dirname, '../cache'),
  maxTextLength: 500
};

// Types
interface CacheMetadata {
  text: string;
  previousText?: string;
  created: string;
  size: number;
}

interface CacheFileInfo {
  hash: string;
  text: string;
  previousText?: string;
  size: number;
  created: string;
}

interface CacheStats {
  totalFiles: number;
  totalSize: number;
  files: CacheFileInfo[];
}

interface ElevenLabsRequest {
  text: string;
  model_id: string;
  language_code?: string;
  previous_text?: string;
  voice_settings: {
    stability: number;
    similarity_boost: number;
  };
  seed?: number;
}

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load API keys
let ELEVENLABS_API_KEY: string = process.env.ELEVENLABS_API_KEY || '';
let AZURE_API_KEY: string = process.env.AZURE_API_KEY || '';

if (CONFIG.provider === 'elevenlabs') {
  if (!ELEVENLABS_API_KEY) {
    console.error('✗ ELEVENLABS_API_KEY not found in environment');
    console.error('  Please set ELEVENLABS_API_KEY in .env in the project root');
    process.exit(1);
  } else {
    console.log('✓ Loaded ElevenLabs API key from environment');
  }
} else if (CONFIG.provider === 'azure') {
  if (!AZURE_API_KEY) {
    console.error('✗ AZURE_API_KEY not found in environment');
    console.error('  Please set AZURE_API_KEY in .env in the project root');
    process.exit(1);
  } else {
    console.log('✓ Loaded Azure Speech API key from environment');
  }
}

// Ensure cache directory exists
if (!existsSync(CONFIG.cacheDir)) {
  mkdirSync(CONFIG.cacheDir, { recursive: true });
  console.log('✓ Created cache directory');
}

/**
 * Generate SHA-256 hash of text for cache key
 */
function generateCacheKey(text: string, previousText?: string): string {
  const cacheInput = previousText ? `${previousText}::${text}` : text;
  return createHash('sha256').update(cacheInput).digest('hex');
}

/**
 * Save metadata for cached file
 */
function saveCacheMetadata(hash: string, text: string, size: number, previousText?: string): void {
  const metadata: CacheMetadata = {
    text,
    created: new Date().toISOString(),
    size
  };
  if (previousText) {
    metadata.previousText = previousText;
  }
  const metadataPath = join(CONFIG.cacheDir, `${hash}.json`);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Load metadata for cached file
 */
function loadCacheMetadata(hash: string): CacheMetadata | null {
  const metadataPath = join(CONFIG.cacheDir, `${hash}.json`);
  if (!existsSync(metadataPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(metadataPath, 'utf-8'));
  } catch (error) {
    console.warn(`Failed to load metadata for ${hash}:`, (error as Error).message);
    return null;
  }
}

/**
 * Get cache statistics
 */
function getCacheStats(): CacheStats {
  const files = readdirSync(CONFIG.cacheDir).filter(f => f.endsWith('.mp3'));
  const stats: CacheStats = {
    totalFiles: files.length,
    totalSize: 0,
    files: []
  };

  for (const file of files) {
    const hash = file.replace('.mp3', '');
    const filePath = join(CONFIG.cacheDir, file);
    const fileStat = statSync(filePath);
    const metadata = loadCacheMetadata(hash);

    stats.totalSize += fileStat.size;
    const fileInfo: CacheFileInfo = {
      hash,
      text: metadata?.text || 'Unknown',
      size: fileStat.size,
      created: metadata?.created || fileStat.birthtime.toISOString()
    };
    if (metadata?.previousText) {
      fileInfo.previousText = metadata.previousText;
    }
    stats.files.push(fileInfo);
  }

  // Sort by creation time (newest first)
  stats.files.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  return stats;
}

/**
 * Call ElevenLabs API to generate TTS
 */
async function callElevenLabsAPI(text: string, previousText?: string, seed?: number): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.voiceId}`;

  console.log(`Calling ElevenLabs API for text: "${text}"${previousText ? ` (context: "${previousText}")` : ''}${seed !== undefined ? ` (seed: ${seed})` : ''}`);

  // When using context, add markers to help with pronunciation flow
  let actualText = text;
  let actualPreviousText = previousText;

  if (previousText) {
    actualPreviousText = `${previousText}。。。`;
    actualText = `。。。${text}`;
  }

  const requestBody: ElevenLabsRequest = {
    text: actualText,
    model_id: CONFIG.model,
    language_code: 'ja',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  };

  if (actualPreviousText) {
    requestBody.previous_text = actualPreviousText;
  }

  if (seed !== undefined) {
    requestBody.seed = seed;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

/**
 * Escape special characters for XML/SSML
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

/**
 * Call Azure Speech API to generate TTS
 */
async function callAzureSpeechAPI(text: string, previousText?: string): Promise<Buffer> {
  console.log(`Calling Azure Speech API for text: "${text}"${previousText ? ` (with context: "${previousText}")` : ''}`);

  return new Promise((resolve, reject) => {
    // Create speech config
    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_API_KEY, CONFIG.azureRegion);
    speechConfig.speechSynthesisVoiceName = CONFIG.azureVoice;
    // Use highest quality MP3 format: 48kHz at 192kbps
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;

    // Create synthesizer with null output (we'll get the data from events)
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined as any);

    // Azure: Prepend previous text context at volume "silent" (0)
    // This provides context for the neural engine to produce more natural prosody
    const escapedText = escapeXml(text);
    const contextSsml = previousText ? `<prosody volume="0.01">${escapeXml(previousText)}</prosody>` : '';
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
        <voice name="${CONFIG.azureVoice}">
          ${contextSsml}
          ${escapedText}
        </voice>
      </speak>
    `.trim();

    console.log('SSML:', ssml);

    // Synthesize speech
    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        synthesizer.close();

        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          const audioData = result.audioData;
          resolve(Buffer.from(audioData));
        } else {
          const errorDetails = result.errorDetails;
          reject(new Error(`Azure Speech synthesis failed: ${errorDetails}`));
        }
      },
      (error) => {
        synthesizer.close();
        reject(new Error(`Azure Speech API error: ${error}`));
      }
    );
  });
}

/**
 * Generate and cache TTS audio
 */
async function generateAndCacheTTS(text: string, hash: string, previousText?: string, seed?: number): Promise<string> {
  // Call the appropriate TTS provider
  let audioBuffer: Buffer;

  if (CONFIG.provider === 'elevenlabs') {
    audioBuffer = await callElevenLabsAPI(text, previousText, seed);
  } else if (CONFIG.provider === 'azure') {
    // Azure doesn't support seed parameter
    if (seed !== undefined) {
      console.warn('Note: Azure Speech API does not support seed parameter (ignored)');
    }
    audioBuffer = await callAzureSpeechAPI(text, previousText);
  } else {
    throw new Error(`Unknown TTS provider: ${CONFIG.provider}`);
  }

  // Save to cache
  const audioPath = join(CONFIG.cacheDir, `${hash}.mp3`);
  writeFileSync(audioPath, audioBuffer);

  // Save metadata
  saveCacheMetadata(hash, text, audioBuffer.length, previousText);

  console.log(`✓ Cached TTS for "${text}" (${hash}.mp3)`);

  return audioPath;
}

// Routes

/**
 * GET / - Serve management UI
 */
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(join(__dirname, '../public', 'index.html'));
});

/**
 * GET /health - Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /tts?text=...&previous_text=... - Generate or serve cached TTS audio
 */
app.get('/tts', async (req: Request, res: Response) => {
  const { text, previous_text } = req.query;

  // Validate input
  if (!text) {
    return res.status(400).json({ error: 'Missing "text" parameter' });
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid text parameter' });
  }

  if (text.length > CONFIG.maxTextLength) {
    return res.status(400).json({
      error: `Text too long (max ${CONFIG.maxTextLength} characters)`
    });
  }

  const previousText = previous_text && typeof previous_text === 'string' ? previous_text : undefined;

  // Generate cache key
  const hash = generateCacheKey(text, previousText);
  const audioPath = join(CONFIG.cacheDir, `${hash}.mp3`);

  try {
    // If download is requested, set headers
    if (req.query.download === 'true') {
      const sanitizedText = (text as string).replace(/[\\/:*?"<>|]/g, '_').slice(0, 50);
      const filename = `${sanitizedText}.mp3`;
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    }

    // Check if cached
    if (existsSync(audioPath)) {
      console.log(`Cache HIT for "${text}" (${hash}.mp3)`);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache-Status': 'HIT'
      });
      return res.sendFile(audioPath);
    }

    // Cache miss - generate TTS
    console.log(`Cache MISS for "${text}"`);
    await generateAndCacheTTS(text, hash, previousText);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000',
      'X-Cache-Status': 'MISS'
    });
    res.sendFile(audioPath);

  } catch (error) {
    console.error('TTS generation failed:', error);
    res.status(500).json({
      error: 'TTS generation failed',
      details: (error as Error).message
    });
  }
});

/**
 * GET /api/cache - Get cache statistics
 */
app.get('/api/cache', (_req: Request, res: Response) => {
  try {
    const stats = getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

/**
 * POST /api/cache/clear - Clear all cached files
 */
app.post('/api/cache/clear', (_req: Request, res: Response) => {
  try {
    const files = readdirSync(CONFIG.cacheDir);
    let deleted = 0;

    for (const file of files) {
      if (file === '.gitkeep') continue;
      const filePath = join(CONFIG.cacheDir, file);
      unlinkSync(filePath);
      deleted++;
    }

    console.log(`✓ Cleared cache (deleted ${deleted} files)`);
    res.json({ success: true, deleted: Math.floor(deleted / 2) }); // Divide by 2 (mp3 + json)
  } catch (error) {
    console.error('Failed to clear cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * DELETE /api/cache/:hash - Delete specific cached file
 */
app.delete('/api/cache/:hash', (req: Request, res: Response) => {
  const { hash } = req.params;

  try {
    const audioPath = join(CONFIG.cacheDir, `${hash}.mp3`);
    const metadataPath = join(CONFIG.cacheDir, `${hash}.json`);

    let deleted = false;

    if (existsSync(audioPath)) {
      unlinkSync(audioPath);
      deleted = true;
    }

    if (existsSync(metadataPath)) {
      unlinkSync(metadataPath);
    }

    if (deleted) {
      console.log(`✓ Deleted cached file ${hash}.mp3`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error(`Failed to delete ${hash}:`, error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * GET /api/cache/audio/:hash - Get cached audio file
 */
app.get('/api/cache/audio/:hash', (req: Request, res: Response) => {
  const { hash } = req.params;
  const audioPath = join(CONFIG.cacheDir, `${hash}.mp3`);

  if (!existsSync(audioPath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const metadata = loadCacheMetadata(hash);
  if (req.query.download === 'true') {
    const sanitizedText = (metadata?.text || 'tts_audio').replace(/[\\/:*?"<>|]/g, '_').slice(0, 50);
    const filename = `${sanitizedText}.mp3`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  }

  res.set({
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=31536000'
  });
  res.sendFile(audioPath);
});

/**
 * POST /api/regenerate - Delete cached audio and regenerate
 */
app.post('/api/regenerate', async (req: Request, res: Response): Promise<void> => {
  const { text, previous_text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Missing "text" in request body' });
    return;
  }

  const previousText = previous_text && typeof previous_text === 'string' ? previous_text : undefined;

  try {
    const hash = generateCacheKey(text, previousText);
    const audioPath = join(CONFIG.cacheDir, `${hash}.mp3`);
    const metadataPath = join(CONFIG.cacheDir, `${hash}.json`);

    // Delete existing cached files
    if (existsSync(audioPath)) {
      unlinkSync(audioPath);
      console.log(`✓ Deleted old cached audio ${hash}.mp3`);
    }
    if (existsSync(metadataPath)) {
      unlinkSync(metadataPath);
    }

    // Generate random seed for variation (0 to 4294967295)
    const randomSeed = Math.floor(Math.random() * 4294967296);

    // Generate new audio with random seed
    await generateAndCacheTTS(text, hash, previousText, randomSeed);

    let url = `/tts?text=${encodeURIComponent(text)}`;
    if (previousText) {
      url += `&previous_text=${encodeURIComponent(previousText)}`;
    }

    res.json({
      success: true,
      hash,
      url
    });
  } catch (error) {
    console.error('Regeneration failed:', error);
    res.status(500).json({
      error: 'Regeneration failed',
      details: (error as Error).message
    });
  }
});

/**
 * POST /api/test - Test TTS generation
 */
app.post('/api/test', async (req: Request, res: Response): Promise<void> => {
  const { text, previous_text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Missing "text" in request body' });
    return;
  }

  const previousText = previous_text && typeof previous_text === 'string' ? previous_text : undefined;

  try {
    const hash = generateCacheKey(text, previousText);
    const audioPath = join(CONFIG.cacheDir, `${hash}.mp3`);
    const cached = existsSync(audioPath);

    if (!cached) {
      await generateAndCacheTTS(text, hash, previousText);
    }

    let url = `/tts?text=${encodeURIComponent(text)}`;
    if (previousText) {
      url += `&previous_text=${encodeURIComponent(previousText)}`;
    }

    res.json({
      success: true,
      cached,
      hash,
      url
    });
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({
      error: 'Test failed',
      details: (error as Error).message
    });
  }
});

// Start server
app.listen(CONFIG.port, () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Japanese TTS Service');
  console.log('═══════════════════════════════════════════');
  console.log(`  Port:     ${CONFIG.port}`);
  console.log(`  Provider: ${CONFIG.provider.toUpperCase()}`);

  if (CONFIG.provider === 'elevenlabs') {
    console.log(`  Voice:    ${CONFIG.voiceId}`);
    console.log(`  Model:    ${CONFIG.model}`);
  } else if (CONFIG.provider === 'azure') {
    console.log(`  Region:   ${CONFIG.azureRegion}`);
    console.log(`  Voice:    ${CONFIG.azureVoice}`);
  }

  console.log(`  Cache:    ${CONFIG.cacheDir}`);
  console.log('');
  console.log(`  Management UI: http://localhost:${CONFIG.port}`);
  console.log(`  TTS Endpoint:  http://localhost:${CONFIG.port}/tts?text=...`);
  console.log('═══════════════════════════════════════════');
  console.log('');
});
