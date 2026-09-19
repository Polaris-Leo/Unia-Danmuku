import assert from 'node:assert/strict';
import { decodeSendGiftV2, normalizeGiftData } from '../src/services/giftParser.js';

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
const item = Buffer.concat([
  field(1, 35961),
  text(2, '亲密之旅plus'),
  field(3, 2),
  field(5, 100),
  field(7, 200),
  text(8, 'silver'),
  field(10, 1710000000),
  text(18, '赠送')
]);
const broadcast = Buffer.concat([
  field(1, 123),
  text(2, '测试用户'),
  text(3, 'http://example.com/face.jpg'),
  lengthDelimited(10, item)
]);

const decoded = decodeSendGiftV2(broadcast.toString('base64'));
assert.equal(decoded.uid, 123);
assert.equal(decoded.gift_list[0].gift_id, 35961);
assert.equal(decoded.gift_list[0].gift_name, '亲密之旅plus');

const normalized = normalizeGiftData({
  uid: decoded.uid,
  uname: decoded.uname,
  face: decoded.face,
  ...decoded.gift_list[0]
});
assert.equal(normalized.giftName, '亲密之旅plus');
assert.equal(normalized.giftId, 35961);
assert.equal(normalized.num, 2);
assert.equal(normalized.price, 100);
assert.equal(normalized.totalCoin, 200);
assert.equal(normalized.coinType, 'silver');

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

console.log('gift parser tests passed');
