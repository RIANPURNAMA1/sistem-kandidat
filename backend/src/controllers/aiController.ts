import { Request, Response } from 'express';
import { chatWithAI } from '../services/aiService';

export async function chat(req: Request, res: Response) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Pesan tidak boleh kosong',
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Pesan maksimal 1000 karakter',
      });
    }

    const response = await chatWithAI(message);

    return res.json({
      success: true,
      data: { response },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message?.includes('quota')
        ? 'Layanan AI sedang sibuk, silakan coba lagi nanti.'
        : 'Terjadi kesalahan sistem',
    });
  }
}
