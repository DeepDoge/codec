// internal number-based varint (for lengths, etc.)
function encodeVarInt(value: number): Uint8Array {
	const parts = [];
	while (value > 0x7F) {
		parts.push((value & 0x7F) | 0x80);
		value >>>= 7;
	}
	parts.push(value & 0x7F);
	return new Uint8Array(parts);
}
function decodeVarInt(data: Uint8Array): { value: number; bytesRead: number } {
	let value = 0;
	let shift = 0;
	let bytesRead = 0;
	for (const byte of data) {
		value |= (byte & 0x7F) << shift;
		bytesRead++;
		if ((byte & 0x80) === 0) {
			break;
		}
		shift += 7;
	}
	return { value, bytesRead };
}

export namespace Codec {
	export type Infer<T> = T extends Codec<infer U> ? U : never;
}

export abstract class Codec<T> {
	public abstract readonly stride: number | null;
	public abstract encode(value: T): Uint8Array;
	public abstract decode(data: Uint8Array): T;
}

export class I8 extends Codec<number> {
	public readonly stride = 1;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(1);
		const view = new DataView(arr.buffer);
		view.setInt8(0, value);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getInt8(0);
	}
}

export const i8 = new I8();

export class U8 extends Codec<number> {
	public readonly stride = 1;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(1);
		const view = new DataView(arr.buffer);
		view.setUint8(0, value);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getUint8(0);
	}
}

export const u8 = new U8();

export class I16 extends Codec<number> {
	public readonly stride = 2;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(2);
		const view = new DataView(arr.buffer);
		view.setInt16(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getInt16(0, true);
	}
}

export const i16 = new I16();

export class U16 extends Codec<number> {
	public readonly stride = 2;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(2);
		const view = new DataView(arr.buffer);
		view.setUint16(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getUint16(0, true);
	}
}

export const u16 = new U16();

export class I32 extends Codec<number> {
	public readonly stride = 4;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
		view.setInt32(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getInt32(0, true);
	}
}

export const i32 = new I32();

export class U32 extends Codec<number> {
	public readonly stride = 4;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
		view.setUint32(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getUint32(0, true);
	}
}

export const u32 = new U32();

export class I64 extends Codec<bigint> {
	public readonly stride = 8;

	public encode(value: bigint): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
		view.setBigInt64(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): bigint {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getBigInt64(0, true);
	}
}

export const i64 = new I64();

export class U64 extends Codec<bigint> {
	public readonly stride = 8;

	public encode(value: bigint): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
		view.setBigUint64(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): bigint {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getBigUint64(0, true);
	}
}

export const u64 = new U64();

export class F32 extends Codec<number> {
	public readonly stride = 4;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
		view.setFloat32(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getFloat32(0, true);
	}
}

export const f32 = new F32();

export class F64 extends Codec<number> {
	public readonly stride = 8;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
		view.setFloat64(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		return view.getFloat64(0, true);
	}
}

export const f64 = new F64();

export class Bool extends Codec<boolean> {
	public readonly stride = 1;

	public encode(value: boolean): Uint8Array {
		return new Uint8Array([value ? 1 : 0]);
	}

	public decode(data: Uint8Array): boolean {
		return data[0] !== 0;
	}
}

export const bool = new Bool();

export class Str extends Codec<string> {
	public readonly stride = null;
	private readonly encoder = new TextEncoder();
	private readonly decoder = new TextDecoder();

	public encode(value: string): Uint8Array {
		return this.encoder.encode(value);
	}

	public decode(data: Uint8Array): string {
		return this.decoder.decode(data);
	}
}

export const str = new Str();

export class Bytes extends Codec<Uint8Array> {
	public readonly stride = null;
	public encode(value: Uint8Array): Uint8Array {
		return value;
	}
	public decode(data: Uint8Array): Uint8Array {
		return data;
	}
}

export const bytes = new Bytes();

export namespace Option {
	export type Infer<T extends Codec<any>> = Codec.Infer<T> | null;
}
export class Option<T extends Codec<any>> extends Codec<Option.Infer<T>> {
	private readonly codec: T;
	public readonly stride = null;

	constructor(codec: T) {
		super();
		this.codec = codec;
	}

	public encode(value: Option.Infer<T>): Uint8Array {
		if (value === null) {
			return new Uint8Array([]);
		} else {
			return this.codec.encode(value);
		}
	}

	public decode(data: Uint8Array): Option.Infer<T> {
		if (data.length === 0) {
			return null;
		} else {
			return this.codec.decode(data.subarray(1));
		}
	}
}

export namespace Tuple {
	export type Infer<T extends readonly Codec<any>[]> = { [K in keyof T]: Codec.Infer<T[K]> };
}
export class Tuple<T extends readonly Codec<any>[]> extends Codec<Tuple.Infer<T>> {
	public readonly codecs: T;
	public readonly stride: number | null;

	constructor(codecs: T) {
		super();
		this.codecs = codecs;
		this.stride = 0;
		for (const codec of codecs) {
			if (codec.stride === null) {
				this.stride = null;
				break;
			}
			this.stride += codec.stride;
		}
	}

	// if a codec has fixed stride, dont add varint overhead.
	// if a codec has null stride, add varint overhead.
	public encode(value: Tuple.Infer<T>): Uint8Array {
		const parts: Uint8Array[] = [];
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			const part = codec.encode(value[i]!);
			if (codec.stride === null) {
				parts.push(encodeVarInt(part.length));
			}
			parts.push(part);
		}

		const combinedLength = parts.reduce((sum, part) => sum + part.length, 0);
		const combined = new Uint8Array(combinedLength);
		let offset = 0;
		for (const part of parts) {
			combined.set(part, offset);
			offset += part.length;
		}
		return combined;
	}

	public decode(data: Uint8Array): Tuple.Infer<T> {
		const result: unknown[] = [];
		let offset = 0;
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			let length = codec.stride;
			if (length === null) {
				const { value, bytesRead } = decodeVarInt(data.subarray(offset));
				length = value;
				offset += bytesRead;
			}
			const part = data.subarray(offset, offset + length);
			result[i] = codec.decode(part);
			offset += length;
		}
		return result as never;
	}
}

export namespace Struct {
	export type Infer<T extends Record<string, Codec<any>>> = { [K in keyof T]: Codec.Infer<T[K]> };
}
export class Struct<T extends Record<string, Codec<any>>> extends Codec<Struct.Infer<T>> {
	public readonly stride: number | null;
	public readonly shape: T;

	private readonly keys: (keyof T)[];
	private readonly tuple: Tuple<Codec<any>[]>;

	constructor(shape: T) {
		super();
		this.shape = shape;
		this.keys = Object.keys(shape).sort() as (keyof T)[];
		this.tuple = new Tuple(this.keys.map((key) => shape[key]));
		this.stride = this.tuple.stride;
	}

	public encode(value: Struct.Infer<T>): Uint8Array {
		const tupleValue = this.keys.map((key) => value[key]);
		return this.tuple.encode(tupleValue);
	}

	public decode(data: Uint8Array): Struct.Infer<T> {
		const tupleValue = this.tuple.decode(data);
		const result: Partial<Struct.Infer<T>> = {};
		for (let i = 0; i < this.keys.length; i++) {
			const key = this.keys[i]!;
			result[key] = tupleValue[i]!;
		}
		return result as Struct.Infer<T>;
	}
}

export namespace Vector {
	export type Infer<T extends Codec<any>> = Codec.Infer<T>[];
}
export class Vector<T extends Codec<any>> extends Codec<Vector.Infer<T>> {
	public readonly stride = null;
	public readonly codec: T;

	constructor(codec: T) {
		super();
		this.codec = codec;
	}

	public encode(value: Vector.Infer<T>[]): Uint8Array {
		if (this.codec.stride !== null) {
			const parts = new Uint8Array(value.length * this.codec.stride);
			for (let i = 0; i < value.length; i++) {
				const part = this.codec.encode(value[i]!);
				parts.set(part, i * this.codec.stride);
			}
			return parts;
		} else {
			const parts: Uint8Array[] = [];
			for (const item of value) {
				const part = this.codec.encode(item);
				parts.push(encodeVarInt(part.length));
				parts.push(part);
			}

			const combinedLength = parts.reduce((sum, part) => sum + part.length, 0);
			const combined = new Uint8Array(combinedLength);
			let offset = 0;
			for (const part of parts) {
				combined.set(part, offset);
				offset += part.length;
			}
			return combined;
		}
	}

	public decode(data: Uint8Array): Vector.Infer<T> {
		const result: Vector.Infer<T> = [];
		let offset = 0;
		if (this.codec.stride !== null) {
			while (offset + this.codec.stride <= data.length) {
				const part = data.subarray(offset, offset + this.codec.stride);
				result.push(this.codec.decode(part));
				offset += this.codec.stride;
			}
		} else {
			while (offset < data.length) {
				const { value: length, bytesRead } = decodeVarInt(data.subarray(offset));
				offset += bytesRead;
				const part = data.subarray(offset, offset + length);
				result.push(this.codec.decode(part));
				offset += length;
			}
		}
		return result;
	}
}

export namespace Enum {
	export type Infer<T extends Record<string, Codec<any>>> = {
		[K in keyof T]: { type: K; value: Codec.Infer<T[K]> };
	}[keyof T];
}
export class Enum<T extends Record<string, Codec<any>>> extends Codec<Enum.Infer<T>> {
	public readonly stride = null;
	public readonly variants: T;
	private readonly keys: (keyof T)[];

	constructor(variants: T) {
		super();
		this.variants = variants;
		this.keys = Object.keys(variants).sort() as (keyof T)[];
	}

	public encode(value: Enum.Infer<T>): Uint8Array {
		const index = this.keys.indexOf(value.type);
		if (index === -1) {
			throw new Error(`Invalid enum variant: ${String(value.type)}`);
		}
		const codec = this.variants[value.type]!;
		const encodedValue = codec.encode(value.value);
		return new Uint8Array([index, ...encodedValue]);
	}

	public decode(data: Uint8Array): Enum.Infer<T> {
		const index = data[0]!;
		if (index >= this.keys.length) {
			throw new Error(`Invalid enum index: ${index}`);
		}
		const key = this.keys[index]!;
		const codec = this.variants[key]!;
		const value = codec.decode(data.subarray(1));
		return { type: key, value } as never;
	}
}
