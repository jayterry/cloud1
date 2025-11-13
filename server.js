const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(bodyParser.json());

// === Render 健康檢查用 ===
app.get("/", (req, res) => {
  res.send("✅ Mood Gacha server is running.");
});

// === 主要 API ===
app.post("/generate-task", async (req, res) => {
  try {
    const { emotion, description } = req.body;
    if (!emotion) return res.status(400).json({ error: "缺少 emotion 欄位" });

    const prompt = `
      根據下列使用者心情生成療癒任務：
      心情：${emotion}
      描述：${description || "（無描述）"}

      請回覆 JSON：
      {
        "task": { "t": "任務名稱", "c": "分類", "d": "詳細說明" },
        "w": 數字（情緒加權）
      }
    `;

    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "伺服器未設定 API_KEY" });

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

    let result;
    try {
      result = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error("⚠️ JSON 解析失敗：", e);
      return res.status(500).json({ error: "AI 回傳格式錯誤" });
    }

    res.json(result);
  } catch (err) {
    console.error("伺服器錯誤：", err);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// === 啟動伺服器 ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
