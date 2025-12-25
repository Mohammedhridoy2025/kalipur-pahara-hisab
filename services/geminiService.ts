import { GoogleGenAI } from "@google/genai";

// Fallback to empty string to prevent crash on init if key is missing
const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function getFinancialInsights(membersCount: number, balance: number, monthlyExpenses: any[]) {
  if (!apiKey) return "AI কনফিগারেশন পাওয়া যায়নি।";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `আমরা একটি গ্রামের পাহারাদার কল্যাণ ট্রাস্ট চালাই। আমাদের ${membersCount} জন প্রবাসী সদস্য আছেন। বর্তমান তহবিলের ব্যালেন্স ৳${balance}। আমাদের গত কয়েক সপ্তাহের খরচের তালিকা: ${JSON.stringify(monthlyExpenses)}। আমাদের জন্য বাংলায় একটি ছোট আর্থিক পরামর্শ ও সামারি দাও যা দিয়ে আমরা তহবিল আরও ভালোভাবে ম্যানেজ করতে পারি।`,
      config: {
        systemInstruction: "You are a professional financial advisor for a small village community fund in Bangladesh. Speak in friendly, respectful, and helpful Bengali.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "দুঃখিত, এই মুহূর্তে AI সামারি জেনারেট করা সম্ভব হচ্ছে না।";
  }
}

export async function getMotivationalQuote(memberName: string) {
  if (!apiKey) return "আপনার এই দান সদকায়ে জারিয়া হিসেবে কবুল হোক। গ্রামের নিরাপত্তায় আপনার অবদান আল্লাহর রহমতে সংরক্ষিত থাকবে।";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `সদস্যের নাম: ${memberName}। কালিপুর গ্রামের পাহারাদার কল্যাণ তহবিলে উনার অবদানের জন্য ধন্যবাদ জানিয়ে ইসলামী মূল্যবোধের (সদকা/নেকি) আলোকে সর্বোচ্চ ২-৩ লাইনের একটি অত্যন্ত ছোট ও হৃদয়স্পর্শী বাণী দাও। শুধু উক্তিটি লিখবে, কোনো ভূমিকা লিখবে না।`,
      config: {
        systemInstruction: "You are a pious village elder. Write a very short (max 2-3 lines), heart-touching Bengali quote with Islamic values (mentioning reward from Allah/Sadaqah) thanking the expatriate for their charity. DO NOT include any preamble, introduction, or conversational text. Return ONLY the quote text.",
      }
    });
    // Ensure we clean up any accidental quotes or extra whitespace
    return response.text?.replace(/^["']|["']$/g, '').trim() || "আপনার এই দান সদকায়ে জারিয়া হিসেবে কবুল হোক। গ্রামের নিরাপত্তায় আপনার অবদান আল্লাহর রহমতে সংরক্ষিত থাকবে।";
  } catch (error) {
    return "আপনার এই দান সদকায়ে জারিয়া হিসেবে কবুল হোক। গ্রামের নিরাপত্তায় আপনার অবদান আল্লাহর রহমতে সংরক্ষিত থাকবে।";
  }
}