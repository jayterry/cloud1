const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

/* =========================
   基本設定
========================= */

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;

/* =========================
   情緒 → 主題 → 行為資料表
   （完全使用你提供的內容）
========================= */

const EMOTION_ACTIVITY_MAP = {
  "壓力": {
    "呼吸與放鬆": [
      "用計時器做 3 分鐘方形呼吸",
      "從腳到頭的全身伸展配合呼吸"
    ],
    "正念與覺察": [
      "正念飲食，專注咀嚼味道與口感",
      "3 分鐘自由書寫腦中正在想的事"
    ],
    "身體活動": [
      "跟著 10 分鐘伸展或暖身影片活動",
      "固定時間做 20 次開合跳或原地踏步"
    ],
    "休息與睡眠": [
      "設定晚上不再處理工作或學校訊息的界線",
      "寫下明天要做的三件事讓大腦放下"
    ]
  },

  "憂鬱": {
    "行為活化與行動": [
      "拍整理前後照片，只整理一小區",
      "設定 5 分鐘計時完成一件拖很久的小事"
    ],
    "愉悅與興趣活動": [
      "重聽一張以前喜歡的專輯並回想畫面",
      "嘗試做一道簡單新菜或新飲品"
    ],
    "社會連結與支持": [
      "在社群平台留下真誠的鼓勵留言",
      "詢問熟悉的人最近有沒有開心的小事"
    ],
    "自我照顧": [
      "安排一段數位排毒時間",
      "寫一句對自己溫柔的話並貼在顯眼處"
    ]
  },

  "開心": {
    "分享與社交": [
      "拍下喜歡的當下並分享給朋友",
      "和朋友一起玩簡單的小遊戲"
    ],
    "感恩與肯定": [
      "感謝生活中一件平常卻重要的事",
      "把一個小成就說給他人聽"
    ],
    "創造與表達": [
      "錄一段只給自己聽的心情語音",
      "畫一張心情塗鴉或心情地圖"
    ],
    "品味與強化正向經驗": [
      "散步時停下來觀察天空或樹 30 秒",
      "用三個形容詞記錄一個開心瞬間"
    ]
  },

  "疲憊": {
    "休息與充電": [
      "切換姿勢站立 5–10 分鐘",
      "什麼都不做的 5 分鐘發呆時間"
    ],
    "睡眠與節奏": [
      "睡前一小時調暗燈光",
      "建立固定的起床小儀式"
    ],
    "溫和活動": [
      "睡前做腳踝手腕肩頸小幅度旋轉",
      "短距離改走樓梯一次"
    ],
    "身心舒緩": [
      "搭配喜歡氣味做深呼吸",
      "用溫熱毛巾熱敷眼睛或頸部"
    ]
  },

  "迷茫": {
    "自我探索": [
      "寫下反覆出現的問題並列三種可能答案",
      "列出最有成就感的三件事找共同點"
    ],
    "價值與方向": [
      "寫下羨慕他人的特質並反思自身價值",
      "想像理想的一天會把時間花在哪"
    ],
    "資訊與諮詢": [
      "閱讀一篇感興趣領域的介紹或訪談",
      "寫下希望顧問給你的建議"
    ],
    "實驗與嘗試": [
      "留意一次引發好奇的事情並查資料",
      "刻意做一件不同的小選擇"
    ]
  },

  "平靜": {
    "正念與冥想": [
      "1 分鐘只聽環境聲音並數種類",
      "洗手或洗臉時專注水的溫度"
    ],
    "穩定日常節奏": [
      "睡前列出明天最重要的 1–3 件事",
      "每天固定做同一件小事"
    ],
    "溫和身體活動": [
      "在房間慢慢走一圈覺察腳步重量",
      "播放輕柔音樂做緩慢擺手轉身"
    ],
    "寧靜環境與儀式": [
      "清理桌面一小塊區域",
      "點小燈或蠟燭安靜坐 3 分鐘"
    ]
  }
};

/* =========================
   工具函式
========================= */

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* =========================
   OpenAI 相容 API 設定
========================= */

const customOpenAIApi = axios.create({
  baseURL: 'https://free.v36.cm',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

/* =========================
   健康檢查
========================= */

app.get('/', (req, res) => {
  res.send('✅ Mood Gacha AI Server is running');
});

/* =========================
   生成任務 API
========================= */

app.post('/generate-task', async (req, res) => {
  const { emotion, description, retry } = req.body;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API_KEY 未設定' });
  }

  const emotionData = EMOTION_ACTIVITY_MAP[emotion];
  if (!emotionData) {
    return res.status(400).json({ error: '不支援的情緒類型' });
  }

  const themes = Object.keys(emotionData);
  const selectedTheme = randomPick(themes);
  const selectedActivity = randomPick(emotionData[selectedTheme]);

  let systemPrompt = `
你是一個溫暖、具啟發性的心理健康輔導助手。
你不負責診斷或分析情緒，只根據使用者選擇的情緒與指定主題生成任務。
任務必須低負擔、可中斷、具體且安全。
請避免老套建議，並保持創意與多樣性。
請以純 JSON 格式輸出。
`;

  if (retry) {
    systemPrompt += `
這是使用者覺得「不太適合」的情況。
請生成更保守、陪伴型、幾乎不需要努力的任務。
避免任何需要改變狀態或提升表現的內容。
`;
  }

  const userPrompt = `
使用者選擇的情緒是：「${emotion}」
本次任務主題是：「${selectedTheme}」

行為提示：
「${selectedActivity}」

使用者補充描述：
「${description || '無額外描述'}」

請根據以上條件生成以下 JSON：

{
  "task": { "t": "任務標題", "d": "具體步驟（1–3 句）", "c": "任務類別" },
  "message": "溫柔、不說教的陪伴語",
  "w": -10 到 10 的整數
}
`;

  try {
    const response = await customOpenAIApi.post('/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const aiContent = response.data.choices[0].message.content;
    const result = JSON.parse(aiContent);

    res.json(result);
  } catch (error) {
    console.error('API 錯誤:', error.response?.data || error.message);
    res.status(500).json({ error: '無法生成任務' });
  }
});

/* =========================
   啟動伺服器
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
