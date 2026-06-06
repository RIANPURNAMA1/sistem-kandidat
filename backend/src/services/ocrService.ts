import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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

const OCR_PROMPT = `You are an expert OCR system for Indonesian bank transfer receipts.

Analyze the provided bank transfer receipt image and extract data. 
Return ONLY a raw JSON object (no markdown, no code blocks, no explanation).

JSON format:
{
  "senderName": "full name of the sender/account owner who transferred, or null",
  "receiverName": "full name of the recipient/beneficiary who received the transfer, or null",
  "amount": 12500000,
  "bankFrom": "source bank name e.g. BCA, Mandiri, BNI, BRI, or null",
  "bankTo": "destination/recipient bank name, or null",
  "referenceNumber": "transaction/reference/order number as string, or null",
  "transferDate": "date in YYYY-MM-DD format, or null",
  "transferTime": "time in HH:MM:SS format, or null",
  "confidence": 85,
  "isValid": true
}

Rules:
- amount must be a plain number (no Rp, no commas, no dots as thousand separators)
- senderName = the person who sent the money (pengirim)
- receiverName = the person/account who received the money (penerima/tujuan transfer)
- confidence is 0-100 based on how clearly you can read the data
- isValid = true if image clearly shows a bank transfer receipt
- if image is blurry/unreadable, set confidence to a low value and isValid to false`;

export async function processPaymentProof(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
  try {
    logger.info(`Starting OCR, size: ${imageBuffer.length} bytes, type: ${mimeType}`);

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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
    logger.info(`Gemini raw response (first 500 chars): ${text.substring(0, 500)}`);

    // Try to extract JSON from response
    let parsed: any = null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // Try stripping markdown code blocks
        const stripped = text
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/gi, '')
          .trim();
        try {
          parsed = JSON.parse(stripped);
        } catch (e2) {
          logger.error('JSON parse failed:', e2);
        }
      }
    }

    if (!parsed) {
      throw new Error(`Could not parse Gemini response as JSON: ${text.substring(0, 300)}`);
    }

    logger.info(`OCR parsed: ${JSON.stringify(parsed)}`);

    const confidence =
      typeof parsed.confidence === 'number'
        ? parsed.confidence
        : parseFloat(String(parsed.confidence || '0')) || 0;

    return {
      senderName: parsed.senderName || null,
      receiverName: parsed.receiverName || null,
      amount:
        parsed.amount !== undefined && parsed.amount !== null && parsed.amount !== ''
          ? parseFloat(String(parsed.amount).replace(/[^0-9.]/g, '')) || null
          : null,
      bankFrom: parsed.bankFrom || null,
      bankTo: parsed.bankTo || null,
      referenceNumber: parsed.referenceNumber || null,
      transferDate: parsed.transferDate || null,
      transferTime: parsed.transferTime || null,
      confidence,
      rawJson: parsed,
      isValid: Boolean(parsed.isValid),
    };
  } catch (error: any) {
    logger.error('OCR processing error:', {
      message: error.message,
      status: error.status,
    });
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
      rawJson: { error: String(error.message || error) },
      isValid: false,
    };
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
  const tolerance = expectedAmount * 0.01; // 1% tolerance
  return {
    isMatch: difference <= tolerance,
    difference,
  };
}
