
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { PRODUCTS, COMPANY_INFO } from '../constants';

// Initialize the client
// Note: In a real production app, ensure your API key is secured via backend proxy if possible, 
// but for this frontend demo we use process.env.API_KEY directly as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
Bạn là 'Trợ lý ảo Hoàng Phúc', một chuyên gia tư vấn về kính xây dựng của công ty ${COMPANY_INFO.name}.
Nhiệm vụ của bạn là tư vấn cho khách hàng về các sản phẩm kính (cường lực, an toàn, kính hộp, kính trang trí, v.v.) dựa trên nhu cầu của họ.

Thông tin công ty:
- Tên: ${COMPANY_INFO.name}
- Hotline: ${COMPANY_INFO.phone}
- Địa chỉ: ${COMPANY_INFO.address}

Danh sách sản phẩm chính:
${PRODUCTS.map(p => `- ${p.name} (${p.category}): ${p.description}. Giá khoảng: ${p.priceRange}`).join('\n')}

Nguyên tắc tư vấn:
1. Luôn thân thiện, lịch sự, chuyên nghiệp.
2. Trả lời ngắn gọn, đi thẳng vào vấn đề.
3. Nếu khách hỏi về giá cụ thể, hãy đưa ra mức giá tham khảo từ dữ liệu trên và khuyến khích họ gọi hotline để có báo giá chính xác nhất.
4. Đề xuất loại kính phù hợp với ứng dụng (ví dụ: làm cầu thang nên dùng kính cường lực dày, làm cửa sổ chống ồn nên dùng kính hộp).
5. Cuối câu trả lời nên mời gọi khách hàng để lại số điện thoại hoặc liên hệ hotline.
6. Chỉ trả lời các câu hỏi liên quan đến kính, xây dựng, nội thất.
`;

export const sendMessageToGemini = async (message: string, history: { role: 'user' | 'model'; text: string }[]): Promise<string> => {
  try {
    // Convert simple history format to Gemini content format if creating a chat session manually,
    // but here we will use a single generateContent call for stateless simplicity or managing state locally.
    // Ideally, use ai.chats.create for multi-turn. Let's use chat for better context.
    
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 500,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message });
    // FIX: Use response.text to access the model's text output.
    return response.text || "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng gọi hotline để được hỗ trợ nhanh nhất.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hệ thống tư vấn đang bận. Quý khách vui lòng liên hệ trực tiếp qua Hotline: " + COMPANY_INFO.phone;
  }
};