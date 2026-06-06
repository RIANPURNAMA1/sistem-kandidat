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

export async function processPaymentProof(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
  try {
    logger.info(`Starting OCR, size: ${imageBuffer.length} bytes, type: ${mimeType}`);

    const response = await ai.models.generateContent({
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
    logger.info(`Gemini raw response (first 500 chars): ${text.substring(0, 500)}`);

    let parsed: Record<string, unknown> | null = null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
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
  const tolerance = expectedAmount * 0.01;
  return {
    isMatch: difference <= tolerance,
    difference,
  };
}
