const axios = require('axios');

async function testApi(roomId) {
  try {
    const url = 'https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom';
    console.log(`Fetching info for room ${roomId}...`);
    const response = await axios.get(url, {
      params: { room_id: roomId },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.data.code === 0) {
      const data = response.data.data;
      console.log('Anchor Info:', JSON.stringify(data.anchor_info, null, 2));
      console.log('Room Info:', JSON.stringify(data.room_info, null, 2));
    } else {
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testApi(21514463); // Use the room ID mentioned by the user previously
