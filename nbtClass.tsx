import { MUtf8Decoder } from "mutf-8";

export interface NBT {
  id: number;
  name: string;
  nameLength: number;
  payload: any;
  getPayloadLength: () => number;
  getHeaderLength: () => number;
  getTotalLength: () => number;
  toBytes: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void;
}

const LITTLE_ENDIAN = false;

const utf8Encode = new TextEncoder();
const utf8Decode = new TextDecoder("utf-8");
const mutf8Decode = new MUtf8Decoder();

class AbstractNBT implements NBT {
  static ID: number = -1;

  id: number;
  name: string;
  nameLength: number;
  payload: any = null;

  headerLength: number = 2;

  constructor(nameLength: number, name: string, payload?: any) {
    this.nameLength = nameLength;
    this.name = name;
    this.id = (this.constructor as typeof AbstractNBT).ID;
  }

  // Length is ID + Name Length + Name + Data
  getHeaderLength: () => number = () => 1 + 2 + this.headerLength;

  getPayloadLength: () => number = () => {
    throw new Error("Not Implemented in Abstract Class");
  };

  getTotalLength: () => number = () =>
    this.getHeaderLength() + this.getPayloadLength();

  writeHeader: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void = (
    stream
  ) => {
    const data = new DataView(
      stream.buffer,
      stream.byteOffset,
      this.getHeaderLength()
    );
    data.setUint8(0, this.id);
    data.setUint32(1, this.nameLength, LITTLE_ENDIAN);
    const nameArray = utf8Encode.encode(this.name);
    for (let idx = 0; idx < nameArray.length; idx++)
      data.setUint8(3 + idx, nameArray[idx]);
    stream.byteOffset += data.byteLength;
  };

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    () => {
      throw new Error("Not Implemented in Abstract Class");
    };

  toBytes: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void = (
    stream
  ) => {
    this.writeHeader(stream);
    this.writePayload(stream);
  };

  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = () => {
    throw new Error("Not implemented in abstract class");
  };
}

abstract class AbstractNumberNBT extends AbstractNBT {
  payload: number;
  constructor(nameLength: number, name: string, payload: number) {
    super(nameLength, name);
    this.payload = payload;
  }
}

export class TAG_End extends AbstractNBT {
  static ID: number = 0;
  constructor(nameLength: number, name: string, payload: number) {
    super(0, "");
  }
  getHeaderLength: () => number = () => 1;
  getPayloadLength: () => number = () => 0;
  writeHeader: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void = (
    stream
  ) => {
    new DataView(stream.buffer, stream.byteOffset++, 1).setUint8(0, this.id);
  };
  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    () => {};

  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = () => {};
}

export class TAG_Byte extends AbstractNumberNBT {
  static ID: number = 1;
  constructor(nameLength: number, name: string, payload: number) {
    super(nameLength, name, payload);
    if (payload > 127 || payload < -128)
      throw new Error(`Invalid payload ${payload}`);
  }

  getPayloadLength = () => 1;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      ).setInt8(0, this.payload);
      stream.byteOffset += this.getPayloadLength();
    };
  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    return new DataView(stream.buffer, stream.byteOffset++, 1).getInt8(0);
  };
}

export class TAG_Short extends AbstractNumberNBT {
  static ID: number = 2;
  constructor(nameLength: number, name: string, payload: number) {
    super(nameLength, name, payload);
    if (payload > 32767 || payload < -32768 || !Number.isInteger(payload))
      throw new Error(`Invalid payload ${payload}`);
  }

  getPayloadLength = () => 2;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      ).setInt16(0, this.payload, LITTLE_ENDIAN);
      stream.byteOffset += this.getPayloadLength();
    };
  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payload = new DataView(stream.buffer, stream.byteOffset, 2).getInt16(
      0,
      LITTLE_ENDIAN
    );
    stream.byteOffset += 2;
    return payload;
  };
}

export class TAG_Int extends AbstractNumberNBT {
  static ID: number = 3;
  constructor(nameLength: number, name: string, payload: number) {
    super(nameLength, name, payload);
    if (
      payload > 2147483647 ||
      payload < -2147483648 ||
      !Number.isInteger(payload)
    )
      throw new Error(`Invalid payload ${payload}`);
  }

  getPayloadLength = () => 4;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      ).setInt32(0, this.payload, LITTLE_ENDIAN);
      stream.byteOffset += this.getPayloadLength();
    };
  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payload = new DataView(stream.buffer, stream.byteOffset, 4).getInt32(
      0,
      LITTLE_ENDIAN
    );
    stream.byteOffset += 4;
    return payload;
  };
}

export class TAG_Long extends AbstractNBT {
  static ID: number = 4;
  payload: bigint;
  constructor(nameLength: number, name: string, payload: bigint) {
    super(nameLength, name);
    this.payload = payload;
    if (
      payload > BigInt(9223372036854775807) ||
      payload < BigInt(-9223372036854775808) ||
      typeof payload !== "bigint"
    )
      throw new Error(`Invalid payload ${payload}`);
  }

  getPayloadLength = () => 8;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      ).setBigInt64(0, this.payload);
      stream.byteOffset += this.getPayloadLength();
    };
  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payload = new DataView(
      stream.buffer,
      stream.byteOffset,
      8
    ).getBigInt64(0, LITTLE_ENDIAN);
    stream.byteOffset += 8;
    return payload;
  };
}

export class TAG_Float extends AbstractNumberNBT {
  static ID: number = 5;
  constructor(nameLength: number, name: string, payload: number) {
    super(nameLength, name, payload);
    if (typeof payload !== "number" || Number.isInteger(payload))
      throw new Error(`Invalid payload ${payload}`);
  }

  getPayloadLength = () => 4;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      ).setFloat32(0, this.payload);
      stream.byteOffset += this.getPayloadLength();
    };
  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payload = new DataView(
      stream.buffer,
      stream.byteOffset,
      4
    ).getFloat32(0, LITTLE_ENDIAN);
    stream.byteOffset += 4;
    return payload;
  };
}

export class TAG_Double extends AbstractNumberNBT {
  static ID: number = 6;
  constructor(nameLength: number, name: string, payload: number) {
    super(nameLength, name, payload);
    if (typeof payload !== "number" || Number.isInteger(payload))
      throw new Error(`Invalid payload ${payload}`);
  }

  getPayloadLength = () => 8;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      ).setFloat64(0, this.payload);
      stream.byteOffset += this.getPayloadLength();
    };

  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payload = new DataView(
      stream.buffer,
      stream.byteOffset,
      8
    ).getFloat64(0, LITTLE_ENDIAN);
    stream.byteOffset += 8;
    return payload;
  };
}

export class TAG_Byte_Array extends AbstractNBT {
  static ID: number = 7;
  _payloadLength: number;
  payload: Int8Array;

  constructor(nameLength: number, name: string, payload: Int8Array) {
    super(nameLength, name);
    this.payload = payload;
    this._payloadLength = payload.length;
  }

  getPayloadLength = () => 4 + this._payloadLength;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      const data = new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      );
      data.setInt32(0, this._payloadLength, LITTLE_ENDIAN);
      for (let i = 0; i < this._payloadLength; i++) {
        data.setInt8(4 + i, this.payload[i]);
      }
      stream.byteOffset += this.getPayloadLength();
    };
  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payloadLength = new DataView(
      stream.buffer,
      stream.byteOffset,
      4
    ).getInt32(0, LITTLE_ENDIAN);
    stream.byteOffset += 4;
    const payload = new Int8Array(
      stream.buffer,
      stream.byteOffset,
      payloadLength
    );
    stream.byteOffset += payloadLength;
    return payload;
  };
}

export class TAG_String extends AbstractNBT {
  static ID: number = 8;
  _payloadLength: number;
  _rawPayload: Uint8Array;
  payload: string;

  constructor(nameLength: number, name: string, rawPayload: Uint8Array) {
    super(nameLength, name);
    this.payload = mutf8Decode.decode(rawPayload);
    this._rawPayload = rawPayload;
    this._payloadLength = rawPayload.length;
  }

  getPayloadLength = () => 2 + this._payloadLength;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      const data = new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      );
      data.setUint16(0, this._payloadLength);
      for (let i = 0; i < this._payloadLength; i++) {
        data.setUint8(i + 2, this._rawPayload[i]);
      }
      stream.byteOffset += this.getPayloadLength();
    };

  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payloadLength = new DataView(
      stream.buffer,
      stream.byteOffset,
      2
    ).getUint16(0, LITTLE_ENDIAN);
    stream.byteOffset += 2;
    const payload = new Uint8Array(
      stream.buffer,
      stream.byteOffset,
      payloadLength
    );
    stream.byteOffset += payloadLength;
    return payload;
  };
}

export class TAG_List extends AbstractNBT {
  static ID: number = 9;
  _tagType: number;
  _payloadLength: number;
  payload: AbstractNBT[];

  constructor(
    nameLength: number,
    name: string,
    payload: {
      tagType: number;
      payload: AbstractNBT[];
    }
  ) {
    super(nameLength, name);
    this.payload = payload.payload;
    this._tagType = payload.tagType;
    this._payloadLength =
      1 + // Tag type
      4 + // Number of tags
      this.payload.reduce((a, b) => a + b.getTotalLength(), 0);
    if (
      this.payload.some(
        (tag) => tag.id !== this._tagType || tag.nameLength !== 0
      )
    )
      throw new Error(
        "Tag type does not match expected type or name not empty."
      );
  }

  getPayloadLength = () => 2 + this._payloadLength;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      const data = new DataView(stream.buffer, stream.byteOffset, 5);
      data.setUint8(0, this._tagType);
      data.setInt32(1, this.payload.length, LITTLE_ENDIAN);
      stream.byteOffset += 5;
      for (const tag of this.payload) {
        tag.writePayload(stream);
      }
    };
  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const tagType = new DataView(
      stream.buffer,
      stream.byteOffset++,
      1
    ).getUint8(0);
    const tagClass = TAG_ID_TO_CLASS[tagType];
    const payloadLength = new DataView(
      stream.buffer,
      stream.byteOffset,
      4
    ).getInt32(0, LITTLE_ENDIAN);
    stream.byteOffset += 4;
    const res = new Array<AbstractNBT>(payloadLength);
    for (let i = 0; i < payloadLength; i++) {
      res[i] = new tagClass(0, "", tagClass.readPayload(stream));
    }
    return { tagType, payload: res };
  };
}

export class TAG_Compound extends AbstractNBT {
  static ID: number = 10;
  _payloadLength: number;
  payload: NBT[];

  constructor(nameLength: number, name: string, payload: NBT[]) {
    super(nameLength, name);
    this.payload = payload;
    this._payloadLength = payload.reduce((a, b) => a + b.getTotalLength(), 0);
    if (this.payload[this.payload.length - 1].id !== TAG_End.ID)
      throw new Error("TAG_Compound must end with a TAG_End");
  }

  getPayloadLength = () => this._payloadLength;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      for (const tag of this.payload) {
        tag.toBytes(stream);
      }
    };

  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payload = [] as NBT[];
    do {
      payload.push(parseNBT(stream));
    } while (
      payload[payload.length - 1] &&
      payload[payload.length - 1].id !== TAG_End.ID
    );
    return payload;
  };
}

export class TAG_Int_Array extends AbstractNBT {
  static ID: number = 11;
  _payloadLength: number;
  payload: Int32Array;

  constructor(nameLength: number, name: string, payload: Int32Array) {
    super(nameLength, name);
    this.payload = payload;
    this._payloadLength = payload.length;
  }

  getPayloadLength = () => 4 + this._payloadLength * 4;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      const data = new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      );
      data.setInt32(0, this._payloadLength, LITTLE_ENDIAN);
      for (let i = 0; i < this._payloadLength; i++) {
        data.setInt32(4 + i * 4, this.payload[i], LITTLE_ENDIAN);
      }
      stream.byteOffset += this.getPayloadLength();
    };

  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payloadLength = new DataView(
      stream.buffer,
      stream.byteOffset,
      4
    ).getInt32(0, LITTLE_ENDIAN);
    stream.byteOffset += 4;
    const payload = _arrayFromDataView(
      new DataView(stream.buffer, stream.byteOffset, payloadLength * 4),
      32,
      payloadLength
    ) as Int32Array;
    stream.byteOffset += payloadLength * 4;
    return payload;
  };
}

export class TAG_Long_Array extends AbstractNBT {
  static ID: number = 12;
  _payloadLength: number;
  payload: BigInt64Array;

  constructor(nameLength: number, name: string, payload: BigInt64Array) {
    super(nameLength, name);
    this.payload = payload;
    this._payloadLength = payload.length;
  }

  getPayloadLength = () => 4 + this._payloadLength * 8;

  writePayload: (stream: { buffer: ArrayBuffer; byteOffset: number }) => void =
    (stream) => {
      const data = new DataView(
        stream.buffer,
        stream.byteOffset,
        this.getPayloadLength()
      );
      data.setInt32(0, this._payloadLength, LITTLE_ENDIAN);
      for (let i = 0; i < this._payloadLength; i++) {
        data.setBigInt64(4 + i * 8, this.payload[i], LITTLE_ENDIAN);
      }
      stream.byteOffset += this.getPayloadLength();
    };

  static readPayload: (stream: {
    buffer: ArrayBuffer;
    byteOffset: number;
  }) => any = (stream) => {
    const payloadLength = new DataView(
      stream.buffer,
      stream.byteOffset,
      4
    ).getInt32(0, LITTLE_ENDIAN);
    stream.byteOffset += 4;
    const payload = _arrayFromDataView(
      new DataView(stream.buffer, stream.byteOffset, payloadLength * 8),
      64,
      payloadLength
    ) as BigInt64Array;
    stream.byteOffset += payloadLength * 8;
    return payload;
  };
}

const TAG_ID_TO_CLASS: Record<string, typeof AbstractNBT> = {
  [TAG_End.ID]: TAG_End,
  [TAG_Byte.ID]: TAG_Byte,
  [TAG_Short.ID]: TAG_Short,
  [TAG_Int.ID]: TAG_Int,
  [TAG_Long.ID]: TAG_Long,
  [TAG_Float.ID]: TAG_Float,
  [TAG_Double.ID]: TAG_Double,
  [TAG_Byte_Array.ID]: TAG_Byte_Array,
  [TAG_String.ID]: TAG_String,
  [TAG_List.ID]: TAG_List,
  [TAG_Compound.ID]: TAG_Compound,
  [TAG_Int_Array.ID]: TAG_Int_Array,
  [TAG_Long_Array.ID]: TAG_Long_Array,
};

const _arrayFromDataView: (
  dataVeiw: DataView,
  dataSize: number,
  length: number,
  byteOffSet?: number
) => Int32Array | BigInt64Array = (
  dataView,
  dataSize,
  length,
  byteOffSet = 0
) => {
  if (dataSize !== 32 && dataSize !== 64)
    throw new Error("Data size must be 32 or 64");
  const array =
    dataSize === 32 ? new Int32Array(length) : new BigInt64Array(length);
  const byteSize = dataSize / 8;
  if (dataSize === 32) {
    for (let i = 0; i < length; i++) {
      array[i] = dataView.getInt32(byteOffSet + byteSize * i, LITTLE_ENDIAN);
    }
  } else if (dataSize === 64) {
    for (let i = 0; i < length; i++) {
      array[i] = dataView.getBigInt64(byteOffSet + byteSize * i, LITTLE_ENDIAN);
    }
  }
  return array;
};

const _getNBTName: (stream: { buffer: ArrayBuffer; byteOffset: number }) => {
  name: string;
  nameLength: number;
} = (stream) => {
  const nameLength = new DataView(
    stream.buffer,
    stream.byteOffset,
    2
  ).getUint16(0, LITTLE_ENDIAN);
  stream.byteOffset += 2;
  const name = utf8Decode.decode(
    new Uint8Array(stream.buffer, stream.byteOffset, nameLength)
  );
  stream.byteOffset += nameLength;
  return { name, nameLength };
};

export const parseNBT: (stream: {
  buffer: ArrayBuffer;
  byteOffset: number;
}) => NBT = (stream) => {
  if (stream.buffer.byteLength <= stream.byteOffset)
    throw new Error("Reached end of buffer");
  // Get the type of the tag
  const tagId = new DataView(stream.buffer, stream.byteOffset++, 1).getUint8(0);
  let tag = null;
  const { name, nameLength } =
    tagId !== 0 ? _getNBTName(stream) : { name: "", nameLength: 0 };
  if (tagId in TAG_ID_TO_CLASS) {
    const tagClass = TAG_ID_TO_CLASS[tagId];
    tag = new tagClass(nameLength, name, tagClass.readPayload(stream));
  } else {
    throw new Error("Unexppected tag type");
  }
  if (tag) {
    return tag;
  } else {
    throw new Error("Unable to parse tag");
  }
};
