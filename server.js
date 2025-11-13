import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";

// === 建立伺服器 ===
const app = express();
app.use(cors());
app.use(bodyParser.json());

// === 測試首頁（Render 用於健康檢查） ===
app.get("/", (req, res) => {
  res.send("✅ Mood Gacha server is running.");
});

// === AI 任務生成 ===
// 備註：Render 的環境變數設定中要有「API_KEY」欄位
app.post("/generate-task", async (req, res) => {
  try {
    const { emotion, description } = req.body;

    if (!emotion) {
      return res.status(400).json({ error: "缺少 emotion 欄位" });
    }

    const prompt = `
      根據下列使用者心情，生成一個「療癒任務」：
      - 心情：${emotion}
      - 描述：${description || "（無描述）"}

      請用 JSON 格式回覆：
      {
        "task": { "t": "任務名稱", "c": "分類", "d": "詳細說明" },
        "w": 數字（情緒加權）
      }
    `;

    // === 呼叫 OpenAI API ===
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "伺服器未設定 API_KEY" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ OpenAI 回傳錯誤：", data);
      return res.status(500).json({ error: data.error?.message || "OpenAI 錯誤" });
    }

    // 嘗試解析回傳的 JSON
    let result;
    try {
      result = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error("⚠️ JSON 解析失敗：", e);
      return res.status(500).json({ error: "AI 回傳格式錯誤" });
    }

    // 正常回覆
    res.json(result);

  } catch (err) {
    console.error("伺服器錯誤：", err);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// === Render 要求的 port ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
