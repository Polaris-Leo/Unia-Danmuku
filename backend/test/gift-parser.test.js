import assert from 'node:assert/strict';
import { decodeSendGiftV2, normalizeGiftData } from '../src/services/giftParser.js';
import { BilibiliLiveWS } from '../src/services/bilibiliLiveWS.js';

const encodeVarint = (value) => {
  const bytes = [];
  let v = value;
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v);
  return bytes;
};
const field = (n, value) => Buffer.from([...encodeVarint(n << 3), ...encodeVarint(value)]);
const text = (n, value) => {
  const body = Buffer.from(value);
  return Buffer.concat([Buffer.from(encodeVarint((n << 3) | 2)), Buffer.from(encodeVarint(body.length)), body]);
};
const lengthDelimited = (n, body) => Buffer.concat([
  Buffer.from(encodeVarint((n << 3) | 2)),
  Buffer.from(encodeVarint(body.length)),
  body
]);
const fixed32 = (n, value) => {
  const body = Buffer.alloc(4);
  body.writeUInt32LE(value >>> 0);
  return Buffer.concat([Buffer.from(encodeVarint((n << 3) | 5)), body]);
};
const itemGiftInfo = Buffer.concat([
  text(1, 'https://example.com/gift.png'),
  text(2, 'https://example.com/gift.webp'),
  text(99, 'future-field')
]);
const item = Buffer.concat([
  field(1, 35961),
  text(2, '亲密之旅plus'),
  field(3, 2),
  field(4, 1),
  field(5, 100),
  field(7, 200),
  text(8, 'silver'),
  text(9, 'gift-tid'),
  field(10, 1710000000),
  text(12, 'gift-rnd'),
  text(18, '赠送'),
  lengthDelimited(35, itemGiftInfo),
  fixed32(20, 0x3f800000)
]);
const medal = Buffer.concat([
  field(1, 456),
  field(4, 789),
  field(5, 12),
  text(6, '粉丝牌')
]);
const blindGift = Buffer.concat([
  text(3, '盲盒内礼物'),
  field(6, 1000)
]);
const broadcast = Buffer.concat([
  field(1, 123),
  text(2, '测试用户'),
  text(3, 'http://example.com/face.jpg'),
  lengthDelimited(8, medal),
  lengthDelimited(9, blindGift),
  lengthDelimited(10, item)
]);

const decoded = decodeSendGiftV2(broadcast.toString('base64'));
assert.equal(decoded.uid, 123);
assert.equal(decoded.gift_list[0].gift_id, 35961);
assert.equal(decoded.gift_list[0].gift_name, '亲密之旅plus');
assert.equal(decoded.gift_list[0].gift_type, 1);
assert.equal(decoded.gift_list[0].tid, 'gift-tid');
assert.equal(decoded.gift_list[0].rnd, 'gift-rnd');
assert.deepEqual(decoded.gift_list[0].gift_info, {
  img_basic: 'https://example.com/gift.png',
  webp: 'https://example.com/gift.webp',
  field_99: 'future-field'
});
assert.equal(decoded.medal_info.medal_name, '粉丝牌');
assert.equal(decoded.blind_gift.original_gift_name, '盲盒内礼物');

const normalized = normalizeGiftData({
  uid: decoded.uid,
  uname: decoded.uname,
  face: decoded.face,
  medal_info: decoded.medal_info,
  blind_gift: decoded.blind_gift,
  ...decoded.gift_list[0]
});
assert.equal(normalized.giftName, '亲密之旅plus');
assert.equal(normalized.giftId, 35961);
assert.equal(normalized.num, 2);
assert.equal(normalized.price, 100);
assert.equal(normalized.totalCoin, 200);
assert.equal(normalized.coinType, 'silver');
assert.equal(normalized.giftType, 1);
assert.equal(normalized.tid, 'gift-tid');
assert.equal(normalized.rnd, 'gift-rnd');
assert.deepEqual(normalized.giftInfo, {
  img_basic: 'https://example.com/gift.png',
  webp: 'https://example.com/gift.webp',
  field_99: 'future-field'
});
assert.equal(normalized.gift_type, 1);
assert.deepEqual(normalized.medal_info, normalized.medalInfo);
assert.equal(normalized.medalInfo.medal_name, '粉丝牌');
assert.deepEqual(normalized.medal, normalized.medalInfo);
assert.equal(normalized.blindGift.original_gift_name, '盲盒内礼物');

const old = normalizeGiftData({
  uid: 456,
  uname: '旧版用户',
  giftId: 1,
  giftName: '辣条',
  num: 3,
  price: 100,
  total_coin: 300,
  coin_type: 'silver'
});
assert.equal(old.giftName, '辣条');
assert.equal(old.giftId, 1);
assert.equal(old.num, 3);

const blindbox = normalizeGiftData({
  giftName: '盲盒',
  blind_gift: {
    original_gift_name: '盲盒内礼物',
    original_gift_price: 1000
  }
});
assert.equal(blindbox.blindGift.gift_name, '盲盒内礼物');
assert.equal(blindbox.blindGift.original_gift_name, '盲盒内礼物');

const liveWS = new BilibiliLiveWS(1);
liveWS.saveGiftCache = () => {};
const events = [];
liveWS.onGift = (gift) => events.push(gift);
await liveWS.handleCommand({ cmd: 'SEND_GIFT_V2', data: { pb: broadcast.toString('base64') } });
assert.equal(events.length, 1);
assert.equal(events[0].giftType, 1);
assert.equal(events[0].tid, 'gift-tid');
assert.equal(events[0].rnd, 'gift-rnd');
assert.deepEqual(events[0].giftInfo, normalized.giftInfo);
assert.deepEqual(events[0].medalInfo, decoded.medal_info);
assert.deepEqual(events[0].medal, decoded.medal_info);
assert.deepEqual(events[0].blindGift, normalized.blindGift);

console.log('gift parser tests passed');
