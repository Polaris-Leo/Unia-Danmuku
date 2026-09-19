const readVarint = (buffer, state) => {
  let value = 0n;
  let shift = 0n;
  while (state.offset < buffer.length) {
    const byte = buffer[state.offset++];
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      const number = Number(value);
      return Number.isSafeInteger(number) ? number : value.toString();
    }
    shift += 7n;
    if (shift > 70n) throw new Error('Invalid protobuf varint');
  }
  throw new Error('Truncated protobuf varint');
};

const readMessage = (buffer) => {
  const fields = new Map();
  const state = { offset: 0 };
  while (state.offset < buffer.length) {
    const tag = readVarint(buffer, state);
    const fieldNumber = Number(tag) >>> 3;
    const wireType = Number(tag) & 7;
    if (!fieldNumber) throw new Error('Invalid protobuf field number');

    let value;
    if (wireType === 0) {
      value = readVarint(buffer, state);
    } else if (wireType === 2) {
      const length = Number(readVarint(buffer, state));
      if (!Number.isSafeInteger(length) || length < 0 || state.offset + length > buffer.length) {
        throw new Error('Invalid protobuf field length');
      }
      value = buffer.subarray(state.offset, state.offset + length);
      state.offset += length;
    } else if (wireType === 1 || wireType === 5) {
      const length = wireType === 1 ? 8 : 4;
      if (state.offset + length > buffer.length) {
        throw new Error('Truncated protobuf fixed-width field');
      }
      // 保留未知 fixed64/fixed32 字段的原始字节，避免新版协议新增字段导致整条礼物丢失。
      value = buffer.subarray(state.offset, state.offset + length);
      state.offset += length;
    } else {
      throw new Error(`Unsupported protobuf wire type: ${wireType}`);
    }
    const current = fields.get(fieldNumber);
    fields.set(fieldNumber, current === undefined ? value : [...(Array.isArray(current) ? current : [current]), value]);
  }
  return fields;
};

const first = (fields, number) => {
  const value = fields.get(number);
  return Array.isArray(value) ? value[0] : value;
};

const all = (fields, number) => {
  const value = fields.get(number);
  return value === undefined ? [] : (Array.isArray(value) ? value : [value]);
};

const stringValue = (fields, number) => {
  const value = first(fields, number);
  return Buffer.isBuffer(value) ? value.toString('utf8') : (value ?? '');
};

const numberValue = (fields, fieldNumber) => {
  const value = first(fields, fieldNumber);
  if (value === undefined || value === '') return 0;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const decodeGiftItem = (buffer) => {
  const fields = readMessage(buffer);
  const material = first(fields, 35);
  return {
    gift_id: numberValue(fields, 1),
    gift_name: stringValue(fields, 2),
    num: numberValue(fields, 3),
    gift_type: numberValue(fields, 4),
    price: numberValue(fields, 5),
    total_coin: numberValue(fields, 7),
    coin_type: stringValue(fields, 8),
    tid: stringValue(fields, 9),
    timestamp: numberValue(fields, 10),
    rnd: stringValue(fields, 12),
    action: stringValue(fields, 18),
    gift_info: Buffer.isBuffer(material) ? {
      img_basic: stringValue(readMessage(material), 1)
    } : null
  };
};

export const decodeSendGiftV2 = (base64) => {
  const fields = readMessage(Buffer.from(base64, 'base64'));
  const medal = first(fields, 8);
  const blindGift = first(fields, 9);
  return {
    uid: numberValue(fields, 1),
    uname: stringValue(fields, 2),
    face: stringValue(fields, 3),
    guard_level: numberValue(fields, 5),
    medal_info: Buffer.isBuffer(medal) ? (() => {
      const medalFields = readMessage(medal);
      return {
        target_id: numberValue(medalFields, 1),
        anchor_roomid: numberValue(medalFields, 4),
        medal_level: numberValue(medalFields, 5),
        medal_name: stringValue(medalFields, 6)
      };
    })() : null,
    blind_gift: Buffer.isBuffer(blindGift) ? (() => {
      const giftFields = readMessage(blindGift);
      return {
        original_gift_name: stringValue(giftFields, 3),
        original_gift_price: numberValue(giftFields, 6)
      };
    })() : null,
    gift_list: all(fields, 10).filter(Buffer.isBuffer).map(decodeGiftItem)
  };
};

export const normalizeGiftData = (data) => {
  const num = Number(data.num ?? data.giftNum ?? 0) || 0;
  const totalCoin = Number(data.total_coin ?? data.totalCoin ?? 0) || 0;
  const rawPrice = Number(data.price ?? 0) || 0;
  const rawBlindGift = data.blind_gift ?? data.blindGift;
  const blindGift = rawBlindGift ? {
    ...rawBlindGift,
    gift_name: rawBlindGift.gift_name ?? rawBlindGift.original_gift_name ?? '',
    original_gift_name: rawBlindGift.original_gift_name ?? rawBlindGift.gift_name ?? '',
    original_gift_price: Number(rawBlindGift.original_gift_price ?? rawBlindGift.gift_price ?? 0) || 0
  } : null;
  return {
    uid: data.uid,
    uname: data.uname ?? data.username ?? '',
    face: data.face ?? '',
    giftName: data.giftName ?? data.gift_name ?? '',
    giftId: data.giftId ?? data.gift_id ?? 0,
    giftType: data.giftType ?? data.gift_type ?? 0,
    num,
    price: rawPrice || (num > 0 ? Math.floor(totalCoin / num) : 0),
    coinType: data.coinType ?? data.coin_type ?? '',
    totalCoin,
    action: data.action || '赠送',
    timestamp: Number(data.timestamp) || Math.floor(Date.now() / 1000),
    giftInfo: data.gift_info ?? null,
    blindGift,
    medalInfo: data.medal_info ?? data.medalInfo ?? null,
    giftIcon: data.giftIcon ?? data.gift_info?.img_basic ?? data.img_basic ?? ''
  };
};
