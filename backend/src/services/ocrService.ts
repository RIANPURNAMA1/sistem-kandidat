import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { logger } from '../utils/logger';

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export interface OcrResult {
  senderName: string | null;
  receiverName: string | null;
  amount: number | null;
  bankFrom: string | null;
  bankTo: string | null;
  referenceNumber: string | null;
  transferDate: string | null;
  transferTime: string | null;
  confidence: number;
  rawJson: Record<string, unknown>;
  isValid: boolean;
}

const OCR_PROMPT = `You are an expert OCR system for Indonesian payment receipts.

Analyze the provided payment receipt image and extract data. Supports both bank transfers (BCA, Mandiri, BNI, BRI, etc.) and e-wallet receipts (DANA, GoPay, OVO, ShopeePay, LinkAja, etc.).

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation).

JSON format:
{
  "senderName": "full name or phone number of the sender/pengirim, or null",
  "receiverName": "full name of the recipient/penerima, or null",
  "amount": 12500000,
  "bankFrom": "source bank name e.g. BCA, Mandiri or e-wallet name e.g. DANA, GoPay, or null",
  "bankTo": "destination bank name or recipient platform, or null",
  "referenceNumber": "transaction/reference/order/invoice number as string, or null",
  "transferDate": "date in YYYY-MM-DD format, or null",
  "transferTime": "time in HH:MM:SS format, or null",
  "confidence": 85,
  "isValid": true
}

Rules:
- amount must be a plain number (no Rp, no commas, no dots as thousand separators)
- senderName = the person/account who sent the money (pengirim/sumber dana). For DANA: look at "Dari" or pengirim field. For bank: look at sender name.
- receiverName = the person/account who received the money (penerima/tujuan)
- bankFrom = source platform: bank name (BCA, Mandiri, BNI, BRI) OR e-wallet name (DANA, GoPay, OVO, ShopeePay)
- bankTo = destination platform name
- transferDate: extract the transaction date. For DANA receipts, look for "Tanggal" or date near the transaction details.
- transferTime: extract the transaction time. For DANA, look for "Waktu" or time near the transaction details.
- confidence is 0-100 based on how clearly you can read the data
- isValid = true if image clearly shows a payment/transfer receipt (bank or e-wallet)
- if image is blurry/unreadable or not a payment receipt, set confidence to a low value and isValid to false`;

function isGeminiQuotaError(error: any): boolean {
  const msg = error?.message?.toLowerCase() || '';
  const status = error?.status || error?.response?.status;
  return msg.includes('quota') || msg.includes('rate limit') || msg.includes('429') || 
         status === 429 || status === 403 || msg.includes('resource has been exhausted');
}

function parseOcrResponse(text: string): Record<string, unknown> | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      const stripped = text
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();
      try {
        return JSON.parse(stripped);
      } catch {
        logger.error('JSON parse failed from OCR response');
      }
    }
  }
  return null;
}

function buildOcrResult(parsed: Record<string, unknown> | null, error?: string): OcrResult {
  if (!parsed) {
    return {
      senderName: null,
      receiverName: null,
      amount: null,
      bankFrom: null,
      bankTo: null,
      referenceNumber: null,
      transferDate: null,
      transferTime: null,
      confidence: 0,
      rawJson: { error: error || 'Could not parse response' },
      isValid: false,
    };
  }

  const confidence =
    typeof parsed.confidence === 'number'
      ? parsed.confidence
      : parseFloat(String(parsed.confidence || '0')) || 0;

  return {
    senderName: (parsed.senderName as string) || null,
    receiverName: (parsed.receiverName as string) || null,
    amount:
      parsed.amount !== undefined && parsed.amount !== null && parsed.amount !== ''
        ? parseFloat(String(parsed.amount).replace(/[^0-9.]/g, '')) || null
        : null,
    bankFrom: (parsed.bankFrom as string) || null,
    bankTo: (parsed.bankTo as string) || null,
    referenceNumber: (parsed.referenceNumber as string) || null,
    transferDate: (parsed.transferDate as string) || null,
    transferTime: (parsed.transferTime as string) || null,
    confidence,
    rawJson: parsed,
    isValid: Boolean(parsed.isValid),
  };
}

export async function processPaymentProof(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
  try {
    logger.info(`Starting OCR, size: ${imageBuffer.length} bytes, type: ${mimeType}`);

    // Primary: Gemini (supports vision)
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBuffer.toString('base64'),
                },
              },
              { text: OCR_PROMPT },
            ],
          },
        ],
      });

      const text = response.text ?? '';
      logger.info(`Gemini OCR raw response (first 500 chars): ${text.substring(0, 500)}`);

      const parsed = parseOcrResponse(text);
      if (!parsed) {
        throw new Error(`Could not parse Gemini response as JSON: ${text.substring(0, 300)}`);
      }

      logger.info(`Gemini OCR parsed: ${JSON.stringify(parsed)}`);
      return buildOcrResult(parsed);
    } catch (geminiError: any) {
      logger.error('Gemini OCR failed:', {
        message: geminiError.message,
        status: geminiError.status,
      });

      logger.info('OCR switching to Groq vision fallback');

      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      try {
        logger.info(`Trying Groq vision model: ${GROQ_VISION_MODEL}`);
        const groqResponse = await groq.chat.completions.create({
          model: GROQ_VISION_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: OCR_PROMPT },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        });

        const text = groqResponse.choices?.[0]?.message?.content || '';
        logger.info(`Groq ${GROQ_VISION_MODEL} raw response (first 500 chars): ${text.substring(0, 500)}`);

        const parsed = parseOcrResponse(text);
        if (parsed) {
          logger.info(`Groq ${GROQ_VISION_MODEL} OCR parsed: ${JSON.stringify(parsed)}`);
          return buildOcrResult(parsed);
        }
        throw new Error(`Could not parse Groq ${GROQ_VISION_MODEL} response as JSON: ${text.substring(0, 300)}`);
      } catch (err: any) {
        logger.warn(`Groq ${GROQ_VISION_MODEL} failed:`, { message: err.message, status: err.status });
        return buildOcrResult(null, err.message || 'OCR tidak tersedia saat ini. Silakan coba lagi nanti atau verifikasi manual.');
      }
    }
  } catch (error: any) {
    logger.error('OCR processing error:', {
      message: error.message,
      status: error.status,
    });
    return buildOcrResult(null, error.message || 'OCR processing failed');
  }
}

export function validateOcrAmount(
  ocrAmount: number | null,
  expectedAmount: number,
): {
  isMatch: boolean;
  difference: number;
} {
  if (!ocrAmount) return { isMatch: false, difference: expectedAmount };
  const difference = Math.abs(ocrAmount - expectedAmount);
  const tolerance = expectedAmount * 0.01;
  return {
    isMatch: difference <= tolerance,
    difference,
  };
}
