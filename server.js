const express = require('express');
const axios = require('axios');
const cors = require('cors'); 
const app = express();

// 1. CORS 配置
app.use(cors()); 

// 解析 JSON 請求
app.use(express.json());

// **🌟 修正 1：(重要) 從 Render 的環境變數讀取 API Key**
// 您必須在 Render 儀表板的 "Environment" 中設定此變數
const API_KEY = process.env.API_KEY; 

// 設置第三方 OpenAI 兼容 API 請求
const customOpenAIApi = axios.create({
  baseURL: 'https://free.v36.cm', // 使用您提供的 URL
  headers: {
    'Authorization': `Bearer ${API_KEY}`, 
    'Content-Type': 'application/json',
  }
});

// **🌟 修正 2：(重要) 新增 Render 健康檢查路由 (Health Check)**
app.get("/", (req, res) => {
  res.send("✅ Mood Gacha AI Server is running!");
});

// 路由：生成個性化任務與情緒加權
app.post('/generate-task', async (req, res) => {
  const { emotion, description } = req.body;

  // 檢查 API Key 是否已設定
  if (!API_KEY) {
    console.error("❌ 錯誤：API_KEY 未在 Render 環境變數中設定。");
    return res.status(500).json({ error: "伺服器配置錯誤：未設定 API 金鑰。" });
  }

  // 1. 定義系統提示詞 (使用您最新版本)
  const systemPrompt = `你是一個溫暖、具啟發性的心理健康輔導助手。你的任務是根據用戶選擇的情緒和提供的額外描述，生成一個個性化的行動任務與鼓勵或安慰，以及一個介於 -10 到 10 之間的情緒加權數值。
  - **🌟 創意要求 **：請盡量提供**多樣化且具體**的任務。**避免**重複生成常見的任務，例如「深呼吸練習」或「寫下感恩」（例如「分享快樂」），除非用戶的描述非常具體地指向它。
  - **任務 (Task):**
    - 任務標題 (t): 簡短、具體的任務名稱。
    - 任務描述 (d): 執行任務的具體步驟或額外說明。
    - 任務類別 (c): 任務的目標（如：放鬆、感恩、自我照顧、專注）。

  - **情緒加權 (Weight):**
    - 數值 (w): 介於 -10 到 10 之間的整數。
      - 負數表示任務傾向於「改善」或「調節」情緒。
      - 正數表示任務傾向於「放大」或「鼓勵」情緒。

  請以純 JSON 格式回覆，不要包含任何額外文字。`;

  // 2. 用戶提示詞 (User Prompt)
  const userPrompt = `當前情緒為：「${emotion}」。用戶描述為：「${description || '無額外描述'}」。請生成任務與加權，格式必須為：{"task": {"t": "...", "d": "...", "c": "..."}, "w": ...}`;

  try {
    // 3. 調用 API
    const response = await customOpenAIApi.post('/v1/chat/completions', {
      model: "gpt-4o-mini", // (使用您指定的 gpt-4o-mini)
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" } 
    });
    
    // 4. 解析 AI 回應
    const aiContent = response.data.choices[0].message.content;
    const result = JSON.parse(aiContent);
    res.json(result); 

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('第三方 API 錯誤:', errorMessage);
    res.status(500).json({ error: '無法生成任務，請檢查 API 服務是否運行或接口路徑是否正確。' });
  }
});

// **🌟 修正 3：(重要) 使用 Render 提供的 PORT**
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
