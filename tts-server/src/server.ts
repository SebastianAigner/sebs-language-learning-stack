import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, unlinkSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { config as loadDotenv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repositoryRoot = join(__dirname, '../..');
const publicDir = join(__dirname, '../public');
const defaultPreviousText = '[japanese text, clearly enunciated]';
const defaultSuffixText = '。 [brief pause]';
const openRouterEmptyAudioMaxRetries = 5;
const openRouterEmptyAudioRetryDelayMs = 1000;

loadEnvironment();

// Configuration
type TtsProvider = 'elevenlabs' | 'azure' | 'openrouter';
type OpenRouterSpeechFormat = 'mp3' | 'pcm';
type CachedAudioExtension = 'mp3' | 'wav';

interface Config {
  port: number;
  provider: TtsProvider;
  // ElevenLabs settings
  voiceId: string;
  model: string;
  // Azure settings
  azureRegion: string;
  azureVoice: string;
  // OpenRouter settings
  openRouterBaseUrl: string;
  openRouterModel: string;
  openRouterVoice: string;
  openRouterResponseFormat: OpenRouterSpeechFormat;
  openRouterSpeed?: number;
  openRouterProvider?: Record<string, unknown>;
  openRouterPcmSampleRate: number;
  // Audio post-processing settings
  ffmpegPath: string;
  trimAfterSilence: boolean;
  trimSilenceThresholdDb: number;
  trimSilenceMinDurationMs: number;
  trimLeadingSilence: boolean;
  trimLeadingKeepMs: number;
  trimKeepSilenceMs: number;
  trimMinimumAudioMs: number;
  // Common settings
  cacheDir: string;
  maxTextLength: number;
  defaultPreviousText: string;
  defaultSuffixText: string;
}

const envPort = Number(process.env.TTS_SERVER_PORT ?? process.env.PORT);
const CONFIG: Config = {
  port: !Number.isNaN(envPort) && envPort !== 0 ? envPort : 5065,
  provider: readTtsProvider(),
  // ElevenLabs settings
  voiceId: process.env.VOICE_ID ?? '3JDquces8E8bkmvbh6Bc',
  model: process.env.MODEL ?? 'eleven_flash_v2_5',
  // Azure settings
  azureRegion: process.env.AZURE_REGION ?? 'swedencentral',
  azureVoice: process.env.AZURE_VOICE ?? 'ja-JP-Nanami:DragonHDLatestNeural',
  // OpenRouter settings
  openRouterBaseUrl: (process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
  openRouterModel: process.env.OPENROUTER_TTS_MODEL ?? 'google/gemini-3.1-flash-tts-preview',
  openRouterVoice: process.env.OPENROUTER_TTS_VOICE ?? 'Aoede',
  openRouterResponseFormat: readOpenRouterSpeechFormat(),
  openRouterSpeed: readPositiveNumber('OPENROUTER_TTS_SPEED', 1),
  openRouterProvider: readOpenRouterProviderOptions(),
  openRouterPcmSampleRate: readPositiveNumber('OPENROUTER_TTS_PCM_SAMPLE_RATE', 24000) ?? 24000,
  // Audio post-processing settings
  ffmpegPath: process.env.FFMPEG_PATH?.trim() !== '' ? process.env.FFMPEG_PATH?.trim() ?? 'ffmpeg' : 'ffmpeg',
  trimAfterSilence: readBoolean('TTS_TRIM_AFTER_SILENCE', true),
  trimSilenceThresholdDb: readNumber('TTS_TRIM_SILENCE_THRESHOLD_DB', -45),
  trimSilenceMinDurationMs: readPositiveNumber('TTS_TRIM_SILENCE_MIN_MS', 750) ?? 750,
  trimLeadingSilence: readBoolean('TTS_TRIM_LEADING_SILENCE', true),
  trimLeadingKeepMs: readNonNegativeNumber('TTS_TRIM_LEADING_KEEP_MS', 50),
  trimKeepSilenceMs: readNonNegativeNumber('TTS_TRIM_KEEP_SILENCE_MS', 150),
  trimMinimumAudioMs: readNonNegativeNumber('TTS_TRIM_MIN_AUDIO_MS', 250),
  // Common settings
  cacheDir: join(__dirname, '../cache'),
  maxTextLength: 500,
  defaultPreviousText: process.env.TTS_DEFAULT_PREVIOUS_TEXT ?? defaultPreviousText,
  defaultSuffixText: process.env.TTS_DEFAULT_SUFFIX_TEXT ?? defaultSuffixText
};

// Types
interface CacheMetadata {
  text: string;
  previousText?: string;
  suffixText?: string;
  language?: string;
  created: string;
  size: number;
  provider?: TtsProvider;
  model?: string;
  voice?: string;
  contentType?: string;
  extension?: CachedAudioExtension;
  openRouterGenerationId?: string;
  silenceTrim?: SilenceTrimMetadata;
}

interface CacheFileInfo {
  hash: string;
  text: string;
  previousText?: string;
  suffixText?: string;
  size: number;
  created: string;
  provider?: TtsProvider;
  model?: string;
  voice?: string;
  contentType: string;
  extension: CachedAudioExtension;
}

interface TtsRequestBody {
  text?: string;
  previous_text?: string;
  suffix_text?: string;
  language?: string;
}

interface PublicConfigResponse {
  provider: TtsProvider;
  defaultPrefixText: string;
  defaultPreviousText: string;
  defaultSuffixText: string;
}

interface CacheStats {
  totalFiles: number;
  totalSize: number;
  files: CacheFileInfo[];
}

interface LiveFeedEvent {
  id: string;
  text: string;
  previousText?: string;
  suffixText?: string;
  hash: string;
  timestamp: string;
  status: 'HIT' | 'MISS' | 'REGENERATED';
}

interface ElevenLabsRequest {
  text: string;
  model_id: string;
  language_code?: string;
  previous_text?: string;
  next_text?: string;
  voice_settings: {
    stability: number;
    similarity_boost: number;
  };
  seed?: number;
}

interface OpenRouterSpeechRequest {
  input: string;
  model: string;
  voice: string;
  response_format: OpenRouterSpeechFormat;
  speed?: number;
  provider?: Record<string, unknown>;
}

interface GeneratedAudio {
  buffer: Buffer;
  contentType: string;
  extension: CachedAudioExtension;
  openRouterGenerationId?: string;
  silenceTrim?: SilenceTrimMetadata;
}

interface SilenceTrimMetadata {
  originalSize: number;
  trimmedSize: number;
  leadingTrimMs?: number;
  silenceStartMs?: number;
  trimmedAtMs?: number;
}

interface SilenceInterval {
  startSeconds: number;
  endSeconds?: number;
  durationSeconds?: number;
}

interface CachedAudio {
  audioPath: string;
  contentType: string;
  extension: CachedAudioExtension;
}

function loadEnvironment(): void {
  const envPaths = [join(repositoryRoot, '.env'), join(__dirname, '../.env')];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false });
    }
  }
}

function readTtsProvider(): TtsProvider {
  const provider = process.env.TTS_PROVIDER?.trim().toLowerCase();

  if (provider === undefined || provider === '') {
    return 'openrouter';
  }

  if (provider === 'elevenlabs' || provider === 'azure' || provider === 'openrouter') {
    return provider;
  }

  console.warn(`Unknown TTS_PROVIDER "${provider}", defaulting to openrouter`);
  return 'openrouter';
}

function readOpenRouterSpeechFormat(): OpenRouterSpeechFormat {
  const format = process.env.OPENROUTER_TTS_RESPONSE_FORMAT?.trim().toLowerCase();

  if (format === undefined || format === '') {
    return 'pcm';
  }

  if (format === 'mp3' || format === 'pcm') {
    return format;
  }

  console.warn(`Unknown OPENROUTER_TTS_RESPONSE_FORMAT "${format}", defaulting to pcm`);
  return 'pcm';
}

function readPositiveNumber(name: string, defaultValue?: number): number | undefined {
  const rawValue = process.env[name]?.trim();

  if (rawValue === undefined || rawValue === '') {
    return defaultValue;
  }

  const value = Number(rawValue);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  console.warn(`Ignoring invalid ${name}; expected a positive number`);
  return defaultValue;
}

function readNonNegativeNumber(name: string, defaultValue: number): number {
  const rawValue = process.env[name]?.trim();

  if (rawValue === undefined || rawValue === '') {
    return defaultValue;
  }

  const value = Number(rawValue);
  if (Number.isFinite(value) && value >= 0) {
    return value;
  }

  console.warn(`Ignoring invalid ${name}; expected a non-negative number`);
  return defaultValue;
}

function readNumber(name: string, defaultValue: number): number {
  const rawValue = process.env[name]?.trim();

  if (rawValue === undefined || rawValue === '') {
    return defaultValue;
  }

  const value = Number(rawValue);
  if (Number.isFinite(value)) {
    return value;
  }

  console.warn(`Ignoring invalid ${name}; expected a number`);
  return defaultValue;
}

function readBoolean(name: string, defaultValue: boolean): boolean {
  const rawValue = process.env[name]?.trim().toLowerCase();

  if (rawValue === undefined || rawValue === '') {
    return defaultValue;
  }

  if (rawValue === 'true' || rawValue === '1' || rawValue === 'yes' || rawValue === 'on') {
    return true;
  }

  if (rawValue === 'false' || rawValue === '0' || rawValue === 'no' || rawValue === 'off') {
    return false;
  }

  console.warn(`Ignoring invalid ${name}; expected true or false`);
  return defaultValue;
}

function readOpenRouterProviderOptions(): Record<string, unknown> | undefined {
  const rawValue = process.env.OPENROUTER_TTS_PROVIDER?.trim();

  if (rawValue === undefined || rawValue === '') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (isPlainObject(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to warning below.
  }

  console.warn('Ignoring invalid OPENROUTER_TTS_PROVIDER; expected a JSON object');
  return undefined;
}

function loadOpenRouterApiKey(): string {
  const envKey = process.env.OPENROUTER_API_KEY?.trim();
  if (envKey !== undefined && envKey !== '') {
    return envKey;
  }

  const configuredKeyPath = process.env.OPENROUTER_API_KEY_FILE?.trim();
  const candidatePaths = [
    ...(configuredKeyPath !== undefined && configuredKeyPath !== '' ? [configuredKeyPath] : []),
    join(repositoryRoot, 'openrouter.txt'),
    join(__dirname, '../openrouter.txt')
  ];

  for (const keyPath of candidatePaths) {
    if (!existsSync(keyPath)) {
      continue;
    }

    const fileKey = readFileSync(keyPath, 'utf-8').trim();
    if (fileKey !== '') {
      return fileKey;
    }
  }

  return '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));

// Load API keys
const ELEVENLABS_API_KEY: string = process.env.ELEVENLABS_API_KEY ?? '';
const AZURE_API_KEY: string = process.env.AZURE_API_KEY ?? '';
const OPENROUTER_API_KEY: string = loadOpenRouterApiKey();

// SSE clients
let sseClients: Response[] = [];

/**
 * Broadcast event to all SSE clients
 */
function broadcastLiveFeedEvent(event: Omit<LiveFeedEvent, 'id' | 'timestamp'>): void {
  const fullEvent: LiveFeedEvent = {
    ...event,
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString()
  };

  const data = `data: ${JSON.stringify(fullEvent)}\n\n`;
  sseClients.forEach(client => client.write(data));
}

switch (CONFIG.provider) {
  case 'elevenlabs':
    if (ELEVENLABS_API_KEY === '') {
      console.error('✗ ELEVENLABS_API_KEY not found in environment');
      console.error('  Please set ELEVENLABS_API_KEY in .env in the project root');
      process.exit(1);
    } else {
      console.log('✓ Loaded ElevenLabs API key from environment');
    }
    break;
  case 'azure':
    if (AZURE_API_KEY === '') {
      console.error('✗ AZURE_API_KEY not found in environment');
      console.error('  Please set AZURE_API_KEY in .env in the project root');
      process.exit(1);
    } else {
      console.log('✓ Loaded Azure Speech API key from environment');
    }
    break;
  case 'openrouter':
    if (OPENROUTER_API_KEY === '') {
      console.error('✗ OPENROUTER_API_KEY not found in environment or openrouter.txt');
      console.error('  Please set OPENROUTER_API_KEY in .env in the project root');
      process.exit(1);
    } else {
      console.log('✓ Loaded OpenRouter API key');
    }
    break;
}

// Ensure cache directory exists
if (!existsSync(CONFIG.cacheDir)) {
  mkdirSync(CONFIG.cacheDir, { recursive: true });
  console.log('✓ Created cache directory');
}

/**
 * Generate SHA-256 hash of text for cache key
 */
function generateCacheKey(text: string, previousText?: string, suffixText?: string, language?: string): string {
  const cacheInput = JSON.stringify({
    text,
    previousText: previousText !== undefined && previousText !== '' ? previousText : null,
    suffixText: suffixText !== undefined && suffixText !== '' ? suffixText : null,
    language: language ?? 'ja',
    settings: getProviderCacheSettings()
  });

  return createHash('sha256').update(cacheInput).digest('hex');
}

function getProviderCacheSettings(): Record<string, unknown> {
  switch (CONFIG.provider) {
    case 'elevenlabs':
      return {
        provider: CONFIG.provider,
        voiceId: CONFIG.voiceId,
        model: CONFIG.model,
        audioProcessing: getAudioProcessingCacheSettings()
      };
    case 'azure':
      return {
        provider: CONFIG.provider,
        region: CONFIG.azureRegion,
        voice: CONFIG.azureVoice,
        audioProcessing: getAudioProcessingCacheSettings()
      };
    case 'openrouter':
      return {
        provider: CONFIG.provider,
        model: CONFIG.openRouterModel,
        voice: CONFIG.openRouterVoice,
        responseFormat: CONFIG.openRouterResponseFormat,
        speed: CONFIG.openRouterSpeed ?? null,
        providerOptions: normalizeForCache(CONFIG.openRouterProvider),
        audioProcessing: getAudioProcessingCacheSettings()
      };
  }
}

function getAudioProcessingCacheSettings(): Record<string, unknown> {
  if (!CONFIG.trimAfterSilence && !CONFIG.trimLeadingSilence) {
    return {
      trimAfterSilence: false,
      trimLeadingSilence: false
    };
  }

  return {
    trimAfterSilence: CONFIG.trimAfterSilence,
    trimLeadingSilence: CONFIG.trimLeadingSilence,
    silenceThresholdDb: CONFIG.trimSilenceThresholdDb,
    silenceMinDurationMs: CONFIG.trimSilenceMinDurationMs,
    leadingKeepSilenceMs: CONFIG.trimLeadingKeepMs,
    keepSilenceMs: CONFIG.trimKeepSilenceMs,
    minimumAudioMs: CONFIG.trimMinimumAudioMs
  };
}

function normalizeForCache(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForCache);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeForCache(value[key])])
    );
  }

  return value;
}

/**
 * Save metadata for cached file
 */
function saveCacheMetadata(
  hash: string,
  text: string,
  audio: GeneratedAudio,
  previousText?: string,
  suffixText?: string,
  language?: string
): void {
  const providerMetadata = getProviderMetadata();
  const metadata: CacheMetadata = {
    text,
    created: new Date().toISOString(),
    size: audio.buffer.length,
    provider: CONFIG.provider,
    contentType: audio.contentType,
    extension: audio.extension,
    ...providerMetadata
  };

  if (language !== undefined && language !== '') {
    metadata.language = language;
  }
  if (previousText !== undefined && previousText !== '') {
    metadata.previousText = previousText;
  }
  if (suffixText !== undefined && suffixText !== '') {
    metadata.suffixText = suffixText;
  }
  if (audio.openRouterGenerationId !== undefined && audio.openRouterGenerationId !== '') {
    metadata.openRouterGenerationId = audio.openRouterGenerationId;
  }
  if (audio.silenceTrim !== undefined) {
    metadata.silenceTrim = audio.silenceTrim;
  }

  const metadataPath = join(CONFIG.cacheDir, `${hash}.json`);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

function getProviderMetadata(): Pick<CacheMetadata, 'model' | 'voice'> {
  switch (CONFIG.provider) {
    case 'elevenlabs':
      return { model: CONFIG.model, voice: CONFIG.voiceId };
    case 'azure':
      return { model: CONFIG.azureRegion, voice: CONFIG.azureVoice };
    case 'openrouter':
      return { model: CONFIG.openRouterModel, voice: CONFIG.openRouterVoice };
  }
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
    return JSON.parse(readFileSync(metadataPath, 'utf-8')) as CacheMetadata;
  } catch (error) {
    console.warn(`Failed to load metadata for ${hash}:`, (error as Error).message);
    return null;
  }
}

/**
 * Get cache statistics
 */
function getCacheStats(): CacheStats {
  const files = readdirSync(CONFIG.cacheDir).filter(isAudioCacheFile);
  const stats: CacheStats = {
    totalFiles: files.length,
    totalSize: 0,
    files: []
  };

  for (const file of files) {
    const extension = getAudioExtension(file);
    const hash = stripAudioExtension(file);
    const filePath = join(CONFIG.cacheDir, file);
    const fileStat = statSync(filePath);
    const metadata = loadCacheMetadata(hash);

    stats.totalSize += fileStat.size;
    const fileInfo: CacheFileInfo = {
      hash,
      text: metadata?.text ?? 'Unknown',
      size: fileStat.size,
      created: metadata?.created ?? fileStat.birthtime.toISOString(),
      contentType: metadata?.contentType ?? contentTypeForExtension(extension),
      extension
    };
    if (metadata?.previousText !== undefined && metadata.previousText !== '') {
      fileInfo.previousText = metadata.previousText;
    }
    if (metadata?.suffixText !== undefined && metadata.suffixText !== '') {
      fileInfo.suffixText = metadata.suffixText;
    }
    if (metadata?.provider !== undefined) {
      fileInfo.provider = metadata.provider;
    }
    if (metadata?.model !== undefined) {
      fileInfo.model = metadata.model;
    }
    if (metadata?.voice !== undefined) {
      fileInfo.voice = metadata.voice;
    }
    stats.files.push(fileInfo);
  }

  // Sort by creation time (newest first)
  stats.files.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  return stats;
}

function isAudioCacheFile(fileName: string): boolean {
  return fileName.endsWith('.mp3') || fileName.endsWith('.wav');
}

function getAudioExtension(fileName: string): CachedAudioExtension {
  return fileName.endsWith('.wav') ? 'wav' : 'mp3';
}

function stripAudioExtension(fileName: string): string {
  return fileName.replace(/\.(mp3|wav)$/u, '');
}

function contentTypeForExtension(extension: CachedAudioExtension): string {
  return extension === 'wav' ? 'audio/wav' : 'audio/mpeg';
}

function getCachedAudio(hash: string): CachedAudio | null {
  const metadata = loadCacheMetadata(hash);
  const preferredExtension = metadata?.extension;
  const candidateExtensions: CachedAudioExtension[] =
    preferredExtension !== undefined ? [preferredExtension, 'mp3', 'wav'] : ['mp3', 'wav'];

  for (const extension of Array.from(new Set(candidateExtensions))) {
    const audioPath = join(CONFIG.cacheDir, `${hash}.${extension}`);
    if (existsSync(audioPath)) {
      return {
        audioPath,
        contentType: metadata?.contentType ?? contentTypeForExtension(extension),
        extension
      };
    }
  }

  return null;
}

function setDownloadHeader(res: Response, text: string, extension: CachedAudioExtension): void {
  const sanitizedText = text.replace(/[\\/:*?"<>|]/g, '_').slice(0, 50);
  const filename = `${sanitizedText}.${extension}`;
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
}

function resolvePreviousText(value: unknown, language?: string): string | undefined {
  if (language === 'en') {
    return typeof value === 'string' && value !== '' ? value : undefined;
  }
  return resolveDefaultableText(value, CONFIG.defaultPreviousText);
}

function resolveSuffixText(value: unknown): string | undefined {
  return resolveDefaultableText(value, CONFIG.defaultSuffixText);
}

function resolveDefaultableText(value: unknown, defaultValue: string): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  return defaultValue !== '' ? defaultValue : undefined;
}

function buildTtsUrl(text: string, previousText?: string, suffixText?: string, language?: string): string {
  let url = `/tts?text=${encodeURIComponent(text)}`;
  if (previousText !== undefined && previousText !== '') {
    url += `&previous_text=${encodeURIComponent(previousText)}`;
  }
  if (suffixText !== undefined && suffixText !== '') {
    url += `&suffix_text=${encodeURIComponent(suffixText)}`;
  }
  if (language !== undefined && language !== '' && language !== 'ja') {
    url += `&language=${encodeURIComponent(language)}`;
  }

  return url;
}

/**
 * Call ElevenLabs API to generate TTS
 */
async function callElevenLabsAPI(text: string, previousText?: string, suffixText?: string, seed?: number, language?: string): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.voiceId}`;

  console.log(`Calling ElevenLabs API for text: "${text}"${previousText !== undefined && previousText !== '' ? ` (context: "${previousText}")` : ''}${suffixText !== undefined && suffixText !== '' ? ` (suffix: "${suffixText}")` : ''}${seed !== undefined ? ` (seed: ${seed})` : ''}`);

  // When using context, add markers to help with pronunciation flow
  let actualText = text;
  let actualPreviousText = previousText;

  if (previousText !== undefined && previousText !== '') {
    actualPreviousText = `${previousText}。。。`;
    actualText = `。。。${text}`;
  }

  const requestBody: ElevenLabsRequest = {
    text: actualText,
    model_id: CONFIG.model,
    language_code: language ?? 'ja',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  };

  if (actualPreviousText !== undefined && actualPreviousText !== '') {
    requestBody.previous_text = actualPreviousText;
  }
  if (suffixText !== undefined && suffixText !== '') {
    requestBody.next_text = suffixText;
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
async function callAzureSpeechAPI(text: string, previousText?: string, suffixText?: string, language?: string): Promise<Buffer> {
  console.log(`Calling Azure Speech API for text: "${text}"${previousText !== undefined && previousText !== '' ? ` (with context: "${previousText}")` : ''}${suffixText !== undefined && suffixText !== '' ? ` (with suffix: "${suffixText}")` : ''}`);

  return new Promise((resolve, reject) => {
    // Create speech config
    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_API_KEY, CONFIG.azureRegion);
    speechConfig.speechSynthesisVoiceName = CONFIG.azureVoice;
    // Use highest quality MP3 format: 48kHz at 192kbps
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;

    // Create synthesizer with null output (we'll get the data from events)
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    // Azure: Prepend previous text context at volume "silent" (0)
    // This provides context for the neural engine to produce more natural prosody
    const escapedText = escapeXml(text);
    const contextSsml = previousText !== undefined && previousText !== '' ? `<prosody volume="0.01">${escapeXml(previousText)}</prosody>` : '';
    const suffixSsml = suffixText !== undefined && suffixText !== '' ? `<prosody volume="0.01">${escapeXml(suffixText)}</prosody>` : '';
        const lang = language ?? 'ja-JP';
    const ssmlLang = lang === 'en' || lang === 'en-US' ? 'en-US' : 'ja-JP';
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${ssmlLang}">
        <voice name="${CONFIG.azureVoice}">
          ${contextSsml}
          ${escapedText}
          ${suffixSsml}
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
 * Call OpenRouter Speech API to generate TTS
 */
async function callOpenRouterSpeechAPI(text: string, previousText?: string, suffixText?: string, language?: string): Promise<GeneratedAudio> {
  const effectivePreviousText = language === 'en' ? undefined : previousText;
  const input = buildOpenRouterSpeechInput(text, effectivePreviousText, suffixText);
  const prefixLog = previousText !== undefined && previousText !== '' ? ` (prefix: "${previousText}")` : '';
  const suffixLog = suffixText !== undefined && suffixText !== '' ? ` (suffix: "${suffixText}")` : '';

  console.log(`Calling OpenRouter Speech API for text: "${text}"${prefixLog}${suffixLog} (model: ${CONFIG.openRouterModel}, voice: ${CONFIG.openRouterVoice}, format: ${CONFIG.openRouterResponseFormat})`);

  const requestBodyBase: Omit<OpenRouterSpeechRequest, 'input'> = {
    model: CONFIG.openRouterModel,
    voice: CONFIG.openRouterVoice,
    response_format: CONFIG.openRouterResponseFormat
  };

  if (CONFIG.openRouterSpeed !== undefined) {
    requestBodyBase.speed = CONFIG.openRouterSpeed;
  }

  if (CONFIG.openRouterProvider !== undefined) {
    requestBodyBase.provider = CONFIG.openRouterProvider;
  }

  const generatedAudio = await callOpenRouterSpeechAPIWithEmptyAudioRetries(text, input, requestBodyBase, 'original prompt');
  if (generatedAudio !== null) {
    return generatedAudio;
  }

  const fallbackInput = `${input}.`;
  console.warn(`OpenRouter Speech API exhausted empty-audio retries for "${text}"; retrying with period-suffixed prompt`);
  const fallbackAudio = await callOpenRouterSpeechAPIWithEmptyAudioRetries(
    text,
    fallbackInput,
    requestBodyBase,
    'period-suffixed prompt'
  );

  if (fallbackAudio !== null) {
    return fallbackAudio;
  }

  throw new Error('OpenRouter Speech API returned empty audio after original and period-suffixed prompts.');
}

async function callOpenRouterSpeechAPIWithEmptyAudioRetries(
  text: string,
  input: string,
  requestBodyBase: Omit<OpenRouterSpeechRequest, 'input'>,
  promptLabel: string
): Promise<GeneratedAudio | null> {
  const maxAttempts = openRouterEmptyAudioMaxRetries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const requestBody: OpenRouterSpeechRequest = {
      input,
      ...requestBodyBase
    };

    const response = await fetch(`${CONFIG.openRouterBaseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `http://localhost:${CONFIG.port}`,
        'X-Title': 'Sebs Language Learning TTS Server'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Speech API error (${response.status}): ${extractErrorMessage(errorText)}`);
    }

    const contentType = normalizeOpenRouterContentType(
      response.headers.get('content-type') ?? contentTypeForOpenRouterFormat(CONFIG.openRouterResponseFormat),
      CONFIG.openRouterResponseFormat
    );
    const openRouterGenerationId = response.headers.get('x-generation-id') ?? undefined;
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    if (audioBuffer.length === 0) {
      if (attempt < maxAttempts) {
        console.warn(`OpenRouter Speech API returned empty audio for "${text}" (${promptLabel}) on attempt ${attempt}/${maxAttempts}; retrying in ${openRouterEmptyAudioRetryDelayMs / 1000}s`);
        await sleep(openRouterEmptyAudioRetryDelayMs);
        continue;
      }

      console.warn(`OpenRouter Speech API returned empty audio for "${text}" (${promptLabel}) after ${maxAttempts} attempts.`);
      return null;
    }

    if (shouldWrapPcmAsWav(contentType, CONFIG.openRouterResponseFormat)) {
      const sampleRate = readNumberContentTypeParameter(contentType, 'rate') ?? CONFIG.openRouterPcmSampleRate;
      const channels = readNumberContentTypeParameter(contentType, 'channels') ?? 1;

      return {
        buffer: pcmToWavBuffer(audioBuffer, sampleRate, channels),
        contentType: 'audio/wav',
        extension: 'wav',
        openRouterGenerationId
      };
    }

    return {
      buffer: audioBuffer,
      contentType,
      extension: audioExtensionForOpenRouterResponse(contentType, CONFIG.openRouterResponseFormat),
      openRouterGenerationId
    };
  }

  throw new Error('OpenRouter Speech API retry loop exited unexpectedly.');
}

function buildOpenRouterSpeechInput(text: string, previousText?: string, suffixText?: string): string {
  const promptedText = suffixText !== undefined && suffixText !== '' ? `${text}${suffixText}` : text;
  return previousText !== undefined && previousText !== '' ? `${previousText}\n${promptedText}` : promptedText;
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function contentTypeForOpenRouterFormat(format: OpenRouterSpeechFormat): string {
  return format === 'pcm' ? `audio/pcm;rate=${CONFIG.openRouterPcmSampleRate};channels=1` : 'audio/mpeg';
}

function normalizeOpenRouterContentType(contentType: string, format: OpenRouterSpeechFormat): string {
  if (format === 'mp3' && contentType.toLowerCase().includes('octet-stream')) {
    return 'audio/mpeg';
  }

  return contentType;
}

function shouldWrapPcmAsWav(contentType: string, format: OpenRouterSpeechFormat): boolean {
  const normalizedContentType = contentType.toLowerCase();
  return format === 'pcm' || normalizedContentType.includes('pcm') || normalizedContentType.includes('l16');
}

function audioExtensionForOpenRouterResponse(
  contentType: string,
  format: OpenRouterSpeechFormat
): CachedAudioExtension {
  const normalizedContentType = contentType.toLowerCase();
  if (normalizedContentType.includes('wav') || normalizedContentType.includes('wave')) {
    return 'wav';
  }

  return format === 'pcm' ? 'wav' : 'mp3';
}

function readNumberContentTypeParameter(contentType: string, name: string): number | undefined {
  const match = contentType.match(new RegExp(`(?:^|;)\\s*${name}=([0-9]+)`, 'i'));
  return match ? Number(match[1]) : undefined;
}

function assertAudioBufferHasContent(buffer: Buffer, source: string): void {
  if (buffer.length === 0) {
    throw new Error(`${source} returned empty audio.`);
  }
}

function assertGeneratedAudioHasContent(audio: GeneratedAudio): void {
  assertAudioBufferHasContent(audio.buffer, 'TTS provider');

  if (audio.extension === 'wav' && audio.buffer.length <= 44) {
    throw new Error('TTS provider returned an empty WAV file.');
  }
}

async function trimAudioAfterFirstSilence(audio: GeneratedAudio, text: string): Promise<GeneratedAudio> {
  if (!CONFIG.trimAfterSilence && !CONFIG.trimLeadingSilence) {
    return audio;
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'tts-silence-trim-'));
  const inputPath = join(tempDir, `input.${audio.extension}`);
  const outputPath = join(tempDir, `output.${audio.extension}`);

  try {
    writeFileSync(inputPath, audio.buffer);

    const { stderr } = await runFfmpeg([
      '-hide_banner',
      '-nostdin',
      '-i',
      inputPath,
      '-af',
      `silencedetect=noise=${CONFIG.trimSilenceThresholdDb}dB:d=${formatSeconds(CONFIG.trimSilenceMinDurationMs / 1000)}`,
      '-f',
      'null',
      '-'
    ]);

    const silenceIntervals = parseSilenceIntervals(stderr);
    const startTrimSeconds = CONFIG.trimLeadingSilence
      ? findLeadingSilenceTrimStartSeconds(silenceIntervals, CONFIG.trimLeadingKeepMs / 1000)
      : 0;
    const silenceStartSeconds = CONFIG.trimAfterSilence
      ? findFirstTrailingSilenceStartSeconds(silenceIntervals, CONFIG.trimMinimumAudioMs / 1000)
      : undefined;
    const endTrimSeconds = silenceStartSeconds !== undefined
      ? silenceStartSeconds + CONFIG.trimKeepSilenceMs / 1000
      : undefined;

    if (startTrimSeconds === 0 && endTrimSeconds === undefined) {
      return audio;
    }

    const trimDurationSeconds = endTrimSeconds !== undefined ? endTrimSeconds - startTrimSeconds : undefined;
    if (trimDurationSeconds !== undefined && trimDurationSeconds <= 0) {
      console.warn(`FFmpeg silence trim for "${text}" would remove all audio; keeping original audio`);
      return audio;
    }

    const trimArgs = [
      '-y',
      '-hide_banner',
      '-nostdin',
      '-loglevel',
      'error'
    ];
    if (startTrimSeconds > 0) {
      trimArgs.push('-ss', formatSeconds(startTrimSeconds));
    }
    trimArgs.push('-i', inputPath);
    if (trimDurationSeconds !== undefined) {
      trimArgs.push('-t', formatSeconds(trimDurationSeconds));
    }
    trimArgs.push('-c:a', 'copy', outputPath);

    await runFfmpeg(trimArgs);

    const trimmedBuffer = readFileSync(outputPath);
    assertAudioBufferHasContent(trimmedBuffer, 'FFmpeg silence trim');

    if (trimmedBuffer.length >= audio.buffer.length) {
      console.warn(`FFmpeg silence trim for "${text}" did not reduce audio size; keeping original audio`);
      return audio;
    }

    const leadingTrimMs = startTrimSeconds > 0 ? Math.round(startTrimSeconds * 1000) : undefined;
    const silenceStartMs = silenceStartSeconds !== undefined ? Math.round(silenceStartSeconds * 1000) : undefined;
    const trimmedAtMs = endTrimSeconds !== undefined ? Math.round(endTrimSeconds * 1000) : undefined;
    const trimDetails = [
      leadingTrimMs !== undefined ? `leading ${leadingTrimMs}ms` : undefined,
      silenceStartMs !== undefined ? `after-silence at ${silenceStartMs}ms` : undefined
    ].filter((detail): detail is string => detail !== undefined).join(', ');
    console.log(`Trimmed TTS audio silence for "${text}": ${audio.buffer.length} bytes -> ${trimmedBuffer.length} bytes (${trimDetails})`);

    return {
      ...audio,
      buffer: trimmedBuffer,
      silenceTrim: {
        originalSize: audio.buffer.length,
        trimmedSize: trimmedBuffer.length,
        ...(leadingTrimMs !== undefined ? { leadingTrimMs } : {}),
        ...(silenceStartMs !== undefined ? { silenceStartMs } : {}),
        ...(trimmedAtMs !== undefined ? { trimmedAtMs } : {})
      }
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseSilenceIntervals(ffmpegOutput: string): SilenceInterval[] {
  const silenceIntervals: SilenceInterval[] = [];
  let activeInterval: SilenceInterval | undefined;

  for (const line of ffmpegOutput.split(/\r?\n/)) {
    const startMatch = line.match(/silence_start:\s*([0-9]+(?:\.[0-9]+)?)/);
    if (startMatch !== null) {
      activeInterval = { startSeconds: Number(startMatch[1]) };
      silenceIntervals.push(activeInterval);
      continue;
    }

    const endMatch = line.match(/silence_end:\s*([0-9]+(?:\.[0-9]+)?)(?:\s*\|\s*silence_duration:\s*([0-9]+(?:\.[0-9]+)?))?/);
    if (endMatch !== null) {
      const endSeconds = Number(endMatch[1]);
      const durationMatch = line.match(/silence_duration:\s*([0-9]+(?:\.[0-9]+)?)/);
      const durationSeconds = durationMatch !== null ? Number(durationMatch[1]) : undefined;
      if (activeInterval === undefined) {
        activeInterval = {
          startSeconds: durationSeconds !== undefined ? Math.max(0, endSeconds - durationSeconds) : 0
        };
        silenceIntervals.push(activeInterval);
      }

      activeInterval.endSeconds = endSeconds;
      if (durationSeconds !== undefined) {
        activeInterval.durationSeconds = durationSeconds;
      }
      activeInterval = undefined;
    }
  }

  return silenceIntervals.filter((interval) => Number.isFinite(interval.startSeconds));
}

function findLeadingSilenceTrimStartSeconds(silenceIntervals: SilenceInterval[], keepSeconds: number): number {
  const leadingSilenceStartToleranceSeconds = 0.05;
  const leadingSilence = silenceIntervals.find(
    (interval) => interval.startSeconds <= leadingSilenceStartToleranceSeconds && interval.endSeconds !== undefined
  );

  if (leadingSilence?.endSeconds === undefined) {
    return 0;
  }

  return Math.max(0, leadingSilence.endSeconds - keepSeconds);
}

function findFirstTrailingSilenceStartSeconds(
  silenceIntervals: SilenceInterval[],
  minimumStartSeconds: number
): number | undefined {
  const trailingSilence = silenceIntervals.find(
    (interval) => Number.isFinite(interval.startSeconds) && interval.startSeconds >= minimumStartSeconds
  );

  return trailingSilence?.startSeconds;
}

function formatSeconds(seconds: number): string {
  return seconds.toFixed(3);
}

function runFfmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(CONFIG.ffmpegPath, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const stdoutText = String(stdout);
      const stderrText = String(stderr);

      if (error !== null) {
        reject(new Error(`ffmpeg failed: ${stderrText !== '' ? stderrText : error.message}`));
        return;
      }

      resolve({ stdout: stdoutText, stderr: stderrText });
    });
  });
}

function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate: number, channels: number): Buffer {
  const bitsPerSample = 16;
  const dataSize = pcmBuffer.length;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const wavHeader = Buffer.alloc(44);

  wavHeader.write('RIFF', 0, 'ascii');
  wavHeader.writeUInt32LE(36 + dataSize, 4);
  wavHeader.write('WAVE', 8, 'ascii');
  wavHeader.write('fmt ', 12, 'ascii');
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(channels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write('data', 36, 'ascii');
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

function extractErrorMessage(raw: string): string {
  if (raw === '') {
    return 'No error details returned.';
  }

  try {
    const parsed = JSON.parse(raw) as { error?: string | { message?: string }; message?: string };

    if (typeof parsed.error === 'string') {
      return parsed.error;
    }

    if (parsed.error?.message !== undefined && parsed.error.message !== '') {
      return parsed.error.message;
    }

    if (parsed.message !== undefined && parsed.message !== '') {
      return parsed.message;
    }
  } catch {
    return raw.slice(0, 500);
  }

  return raw.slice(0, 500);
}

/**
 * Generate and cache TTS audio
 */
async function generateAndCacheTTS(
  text: string,
  hash: string,
  previousText?: string,
  suffixText?: string,
  seed?: number,
  language?: string
): Promise<CachedAudio> {
  // Call the appropriate TTS provider
  let audio: GeneratedAudio;

  if (CONFIG.provider === 'elevenlabs') {
    audio = {
      buffer: await callElevenLabsAPI(text, previousText, suffixText, seed, language),
      contentType: 'audio/mpeg',
      extension: 'mp3'
    };
  } else if (CONFIG.provider === 'azure') {
    if (seed !== undefined) {
      console.warn('Note: Azure Speech API does not support seed parameter (ignored)');
    }
    audio = {
      buffer: await callAzureSpeechAPI(text, previousText, suffixText, language),
      contentType: 'audio/mpeg',
      extension: 'mp3'
    };
  } else {
    if (seed !== undefined) {
      console.warn('Note: OpenRouter Speech API does not support seed parameter (ignored)');
    }
    audio = await callOpenRouterSpeechAPI(text, previousText, suffixText, language);
  }

  audio = await trimAudioAfterFirstSilence(audio, text);
  assertGeneratedAudioHasContent(audio);

  // Save to cache
  const audioPath = join(CONFIG.cacheDir, `${hash}.${audio.extension}`);
  writeFileSync(audioPath, audio.buffer);

  // Save metadata
  saveCacheMetadata(hash, text, audio, previousText, suffixText, language);

  console.log(`✓ Cached TTS for "${text}" (${hash}.${audio.extension})`);

  return {
    audioPath,
    contentType: audio.contentType,
    extension: audio.extension
  };
}

// Routes

/**
 * GET / - Serve management UI
 */
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(join(publicDir, 'index.html'));
});

/**
 * GET /health - Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    provider: CONFIG.provider,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/config - Public, non-secret TTS configuration
 */
app.get('/api/config', (_req: Request, res: Response<PublicConfigResponse>) => {
  res.json({
    provider: CONFIG.provider,
    defaultPrefixText: CONFIG.defaultPreviousText,
    defaultPreviousText: CONFIG.defaultPreviousText,
    defaultSuffixText: CONFIG.defaultSuffixText
  });
});

/**
 * GET /api/feed - SSE live feed of TTS requests
 */
app.get('/api/feed', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

/**
 * GET /tts?text=...&previous_text=...&suffix_text=... - Generate or serve cached TTS audio
 */
app.get('/tts', (req: Request, res: Response): void => {
  const { text, previous_text, suffix_text, language } = req.query;

  // Validate input
  if (text === undefined || text === '') {
    res.status(400).json({ error: 'Missing "text" parameter' });
    return;
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ error: 'Invalid text parameter' });
    return;
  }

  if (text.length > CONFIG.maxTextLength) {
    res.status(400).json({
      error: `Text too long (max ${CONFIG.maxTextLength} characters)`
    });
    return;
  }

  const textValue = text;
  const langValue = typeof language === 'string' && language !== '' ? language : undefined;
  const previousText = resolvePreviousText(previous_text, langValue);
  const suffixText = resolveSuffixText(suffix_text);

  // Generate cache key
  const hash = generateCacheKey(textValue, previousText, suffixText, langValue);

  // Check if cached
  const cachedAudio = getCachedAudio(hash);
  if (cachedAudio !== null) {
    console.log(`Cache HIT for "${textValue}" (${hash}.${cachedAudio.extension})`);
    broadcastLiveFeedEvent({
      text: textValue,
      previousText,
      suffixText,
      hash,
      status: 'HIT'
    });
    if (req.query.download === 'true') {
      setDownloadHeader(res, textValue, cachedAudio.extension);
    }
    res.set({
      'Content-Type': cachedAudio.contentType,
      'Cache-Control': 'public, max-age=31536000',
      'X-Cache-Status': 'HIT'
    });
    res.sendFile(cachedAudio.audioPath);
    return;
  }

  // Cache miss - generate TTS
  console.log(`Cache MISS for "${textValue}"`);

  void (async (): Promise<void> => {
    try {
      const generatedAudio = await generateAndCacheTTS(textValue, hash, previousText, suffixText, undefined, langValue);

      broadcastLiveFeedEvent({
        text: textValue,
        previousText,
        suffixText,
        hash,
        status: 'MISS'
      });

      if (req.query.download === 'true') {
        setDownloadHeader(res, textValue, generatedAudio.extension);
      }
      res.set({
        'Content-Type': generatedAudio.contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache-Status': 'MISS'
      });
      res.sendFile(generatedAudio.audioPath);
    } catch (error) {
      console.error('TTS generation failed:', error);
      res.status(500).json({
        error: 'TTS generation failed',
        details: (error as Error).message
      });
    }
  })();
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
    let deletedAudioFiles = 0;

    for (const file of files) {
      if (file === '.gitkeep') continue;
      const filePath = join(CONFIG.cacheDir, file);
      unlinkSync(filePath);
      deleted++;
      if (isAudioCacheFile(file)) {
        deletedAudioFiles++;
      }
    }

    console.log(`✓ Cleared cache (deleted ${deleted} files)`);
    res.json({ success: true, deleted: deletedAudioFiles });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * DELETE /api/cache/:hash - Delete specific cached file
 */
app.delete('/api/cache/:hash', (req: Request<{ hash: string }>, res: Response) => {
  const { hash } = req.params;

  try {
    const audioPaths = [
      join(CONFIG.cacheDir, `${hash}.mp3`),
      join(CONFIG.cacheDir, `${hash}.wav`)
    ];
    const metadataPath = join(CONFIG.cacheDir, `${hash}.json`);

    let deleted = false;

    for (const audioPath of audioPaths) {
      if (existsSync(audioPath)) {
        unlinkSync(audioPath);
        deleted = true;
      }
    }

    if (existsSync(metadataPath)) {
      unlinkSync(metadataPath);
    }

    if (deleted) {
      console.log(`✓ Deleted cached audio ${hash}`);
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
app.get('/api/cache/audio/:hash', (req: Request<{ hash: string }>, res: Response) => {
  const { hash } = req.params;
  const cachedAudio = getCachedAudio(hash);

  if (cachedAudio === null) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const metadata = loadCacheMetadata(hash);
  if (req.query.download === 'true') {
    setDownloadHeader(res, metadata?.text ?? 'tts_audio', cachedAudio.extension);
  }

  res.set({
    'Content-Type': cachedAudio.contentType,
    'Cache-Control': 'public, max-age=31536000'
  });
  res.sendFile(cachedAudio.audioPath);
});

/**
 * POST /api/regenerate - Delete cached audio and regenerate
 */
app.post('/api/regenerate', (req: Request<unknown, unknown, TtsRequestBody>, res: Response): void => {
  const { text, previous_text, suffix_text, language } = req.body;

  if (text === undefined || text === '' || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing "text" in request body' });
    return;
  }

  const textValue = text;
  const langValue = language !== undefined && language !== '' ? language : undefined;
  const previousText = resolvePreviousText(previous_text, langValue);
  const suffixText = resolveSuffixText(suffix_text);

  void (async (): Promise<void> => {
    try {
      const hash = generateCacheKey(textValue, previousText, suffixText, langValue);
      const audioPaths = [
        join(CONFIG.cacheDir, `${hash}.mp3`),
        join(CONFIG.cacheDir, `${hash}.wav`)
      ];
      const metadataPath = join(CONFIG.cacheDir, `${hash}.json`);

      // Delete existing cached files
      for (const audioPath of audioPaths) {
        if (existsSync(audioPath)) {
          unlinkSync(audioPath);
          console.log(`✓ Deleted old cached audio ${audioPath}`);
        }
      }
      if (existsSync(metadataPath)) {
        unlinkSync(metadataPath);
      }

      // Generate random seed for variation (0 to 4294967295)
      const randomSeed = Math.floor(Math.random() * 4294967296);

      // Generate new audio with random seed
      await generateAndCacheTTS(textValue, hash, previousText, suffixText, randomSeed, langValue);

      broadcastLiveFeedEvent({
        text: textValue,
        previousText,
        suffixText,
        hash,
        status: 'REGENERATED'
      });

      const url = buildTtsUrl(textValue, previousText, suffixText, langValue);

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
  })();
});

/**
 * POST /api/test - Test TTS generation
 */
app.post('/api/test', (req: Request<unknown, unknown, TtsRequestBody>, res: Response): void => {
  const { text, previous_text, suffix_text, language } = req.body;

  if (text === undefined || text === '' || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing "text" in request body' });
    return;
  }

  const textValue = text;
  const langValue = language !== undefined && language !== '' ? language : undefined;
  const previousText = resolvePreviousText(previous_text, langValue);
  const suffixText = resolveSuffixText(suffix_text);

  void (async (): Promise<void> => {
    try {
      const hash = generateCacheKey(textValue, previousText, suffixText, langValue);
      const cached = getCachedAudio(hash) !== null;

      if (!cached) {
        await generateAndCacheTTS(textValue, hash, previousText, suffixText, undefined, langValue);
      }

      const url = buildTtsUrl(textValue, previousText, suffixText, langValue);

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
  })();
});

// Start server
app.listen(CONFIG.port, () => {
  console.log(`\n  \x1b[34m\x1b[1mTTS SERVER\x1b[0m is running`);
  console.log('  ═══════════════════════════════════════════');
  console.log('    Japanese TTS Service');
  console.log('  ═══════════════════════════════════════════');
  console.log(`    Port:     ${CONFIG.port}`);
  console.log(`    Provider: ${CONFIG.provider.toUpperCase()}`);

  if (CONFIG.provider === 'elevenlabs') {
    console.log(`    Voice:    ${CONFIG.voiceId}`);
    console.log(`    Model:    ${CONFIG.model}`);
  } else if (CONFIG.provider === 'azure') {
    console.log(`    Region:   ${CONFIG.azureRegion}`);
    console.log(`    Voice:    ${CONFIG.azureVoice}`);
  } else {
    console.log(`    Model:    ${CONFIG.openRouterModel}`);
    console.log(`    Voice:    ${CONFIG.openRouterVoice}`);
    console.log(`    Format:   ${CONFIG.openRouterResponseFormat.toUpperCase()}${CONFIG.openRouterResponseFormat === 'pcm' ? ' (served as WAV)' : ''}`);
  }

  console.log(`    Cache:    ${CONFIG.cacheDir}`);
  console.log(`    Trim:     ${CONFIG.trimLeadingSilence ? 'leading, ' : ''}${CONFIG.trimAfterSilence ? `after ${CONFIG.trimSilenceMinDurationMs}ms below ${CONFIG.trimSilenceThresholdDb}dB` : 'after disabled'}`);
  console.log('');
  console.log(`    Management UI: http://localhost:${CONFIG.port}`);
  console.log(`    TTS Endpoint:  http://localhost:${CONFIG.port}/tts?text=...`);
  console.log('  ═══════════════════════════════════════════\n');
});
