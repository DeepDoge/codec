import { Codec } from "./codec.ts";
import { U8Codec } from "./primitives.ts";
import { varint } from "./varint.ts";

/**
 * Type definitions for Option codec
 *
 * @example
 * ```ts
 * // Value<string> is string | null
 * type V = Option.Value<string>;
 * ```
 */
export declare namespace OptionCodec {
	/**
	 * Value that can be either of type T or null
	 */
	export type Value<T> = T | null;

	/**
	 * Infers the JavaScript type from an Option codec
	 */
	export type Infer<T extends Codec<unknown>> = Codec.Infer<T> | null;
}

/**
 * Codec for optional values (present or null).
 *
 * Encoding:
 * - 0x00 => null
 * - 0x01 => followed by payload bytes encoded with the inner codec
 *
 * @template T - The inner value type
 *
 * @example
 * ```ts
 * const maybeU8 = new Option(u8);
 * Array.from(maybeU8.encode(null));        // [0x00]
 * Array.from(maybeU8.encode(7));           // [0x01, 0x07]
 * maybeU8.decode(new Uint8Array([0]));      // [null, 1]
 * maybeU8.decode(new Uint8Array([1, 9]));   // [9, 2]
 * ```
 */
export class OptionCodec<T> extends Codec<OptionCodec.Value<T>> {
	private readonly codec: Codec<T>;
	public readonly stride = -1;

	constructor(codec: Codec<T>) {
		super();
		this.codec = codec;
	}

	public encode(value: OptionCodec.Value<T>): Uint8Array {
		if (value === null) {
			return new Uint8Array([0]);
		} else {
			const encoded = this.codec.encode(value);
			const result = new Uint8Array(1 + encoded.length);
			result[0] = 1;
			result.set(encoded, 1);
			return result;
		}
	}

	public decode(data: Uint8Array): [OptionCodec.Value<T>, number] {
		if (data[0] === 0) {
			return [null, 1];
		} else {
			const [value, size] = this.codec.decode(data.subarray(1));
			return [value, 1 + size];
		}
	}
}

/**
 * Type definitions for Tuple codec
 *
 * @example
 * ```ts
 * // Infer<[U8, Str]> -> [number, string]
 * type T = Tuple.Infer<[U8, Str]>;
 * ```
 */
export declare namespace TupleCodec {
	/**
	 * Infers the JavaScript tuple type from an array of codecs
	 */
	export type Infer<T extends readonly Codec<unknown>[]> = {
		[K in keyof T]: Codec.Infer<T[K]>;
	};

	/**
	 * Maps tuple elements to their corresponding codecs
	 */
	export type Codecs<T extends readonly unknown[]> =
		| { readonly [I in keyof T]: Codec<T[I]> }
		| { -readonly [I in keyof T]: Codec<T[I]> };
}

/**
 * Codec for fixed-length tuples of potentially different types.
 *
 * Encoding (no length prefixes added by Tuple itself):
 * - For each element in order: append raw bytes from element's encode()
 * - Elements with variable stride must encode their own size info
 *
 * Decoding reads each element in order using stride.
 *
 * @template T - Tuple element types
 *
 * @example
 * ```ts
 * // [u8, str]: first byte is u8, then str with its own varint length
 * const t = new Tuple([u8, str] as const);
 * const enc = t.encode([5, "hi"]);   // [0x05, 0x02, 0x68, 0x69]
 * t.decode(enc);                     // [[5, "hi"], 4]
 * ```
 */
export class TupleCodec<const T extends readonly unknown[]> extends Codec<T> {
	public readonly codecs: TupleCodec.Codecs<T>;
	public readonly stride: number;

	constructor(codecs: TupleCodec.Codecs<T>) {
		super();
		this.codecs = codecs;
		this.stride = 0;
		for (const codec of codecs) {
			if (codec.stride < 0) {
				this.stride = -1;
				break;
			}
			this.stride += codec.stride;
		}
	}

	public encode(value: T): Uint8Array {
		const parts: Uint8Array[] = [];
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			const part = codec.encode(value[i]!);
			parts.push(part);
		}

		const combinedLength = parts.reduce(
			(sum, part) => sum + part.length,
			0,
		);
		const combined = new Uint8Array(combinedLength);
		let offset = 0;
		for (const part of parts) {
			combined.set(part, offset);
			offset += part.length;
		}
		return combined;
	}

	public decode(data: Uint8Array): [T, number] {
		const result: unknown[] = [];
		let offset = 0;
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			const [value, size] = codec.decode(data.subarray(offset));
			result[i] = value;
			offset += size;
		}
		return [result as never, offset];
	}
}

/**
 * Type definitions for Struct codec
 *
 * @example
 * ```ts
 * // Struct.Infer<{ id: U32, name: Str }> -> { id: number, name: string }
 * type S = Struct.Infer<{ id: U32, name: Str }>;
 * ```
 */
export declare namespace StructCodec {
	/**
	 * Infers the JavaScript object type from a record of codecs
	 */
	export type Infer<T extends Readonly<Record<string, Codec<unknown>>>> = {
		[K in (keyof T)]: Codec.Infer<T[K]>;
	};

	/**
	 * Maps struct fields to their corresponding codecs
	 */
	export type Codecs<T extends Readonly<Record<string, unknown>>> =
		| { readonly [K in (keyof T)]: Codec<T[K]> }
		| { -readonly [K in (keyof T)]: Codec<T[K]> };
}

/**
 * Codec for structured objects with named fields.
 *
 * Layout is the same as a Tuple of fields in DEFINITION ORDER.
 * Definition order matters because the binary is a tuple, not a map.
 *
 * For variable-length fields, each field is prefixed with a VarInt length
 * (handled by Tuple), while fixed-size fields are concatenated directly.
 *
 * @template T - Record mapping field names to codecs
 *
 * @example
 * ```ts
 * // Definition order: id (u32) then name (str)
 * const User = new Struct({ id: u32, name: str } as const);
 * const bin = User.encode({ id: 42, name: "Ada" });
 * // Decodes back to the same object
 * User.decode(bin); // [{ id: 42, name: "Ada" }, size]
 * ```
 *
 * @example
 * ```ts
 * // Reordering fields changes the binary layout
 * const User2 = new Struct({ name: str, id: u32 } as const);
 * // User.encode(...) is NOT compatible with User2.decode(...)
 * ```
 */
export class StructCodec<const T extends Readonly<Record<string, unknown>>>
	extends Codec<T> {
	public readonly stride: number;
	public readonly shape: StructCodec.Codecs<T>;

	private readonly keys: (keyof T)[];
	private readonly tuple: TupleCodec<T[(keyof T)][]>;

	constructor(shape: StructCodec.Codecs<T>) {
		super();
		this.shape = shape;
		this.keys = Object.keys(shape) as (keyof T)[];
		this.tuple = new TupleCodec(
			this.keys.map((key) => shape[key]),
		) as never;
		this.stride = this.tuple.stride;
	}

	public encode(value: T): Uint8Array {
		const tupleValue = this.keys.map((key) => value[key]);
		return this.tuple.encode(tupleValue);
	}

	public decode(data: Uint8Array): [T, number] {
		const [tupleValue, size] = this.tuple.decode(data);
		const result: Partial<T> = {};
		for (let i = 0; i < this.keys.length; i++) {
			const key = this.keys[i]!;
			result[key] = tupleValue[i]!;
		}
		return [result as T, size];
	}
}

/**
 * Type definitions for Vector codec
 *
 * @example
 * ```ts
 * // Vector.Infer<U16> -> number[]
 * type V = Vector.Infer<U16>;
 * ```
 */
export declare namespace ArrayCodec {
	/**
	 * Array of values of type T
	 */
	export type Value<T> = T[];

	/**
	 * Infers the JavaScript array type from a codec
	 */
	export type Infer<T extends Codec<unknown>> = Codec.Infer<T>[];
}

/**
 * Options for Vector codec.
 */
export type ArrayOptions<T> = {
	/** Codec for encoding the count prefix. Default is varint. */
	countCodec?: Codec<number>;
	/** Codec for encoding each element. Required. */
	codec: Codec<T>;
};

/**
 * Codec for variable-length arrays of the same element type.
 *
 * Encoding:
 * - Count prefix (varint by default, or custom countCodec)
 * - Elements concatenated (each element knows its own size via stride)
 *
 * @template T - Element type
 *
 * @example
 * ```ts
 * // Default: varint count prefix
 * const nums = new Vector(u16);
 * const b = nums.encode([1, 513]);         // [0x02, 0x02, 0x01, 0x01, 0x02]
 * nums.decode(b);                         // [[1, 513], 5]
 *
 * @example
 * ```ts
 * // Custom count codec (e.g., u32 for fixed 4-byte count)
 * import { u32 } from "./primitives.ts";
 * const numsU32 = new Vector({ codec: u16, countCodec: u32 });
 *
 * @example
 * ```ts
 * // Variable-stride elements
 * const words = new Vector(str);
 * const wb = words.encode(["a", "bc"]);    // [0x02, 0x01, 'a', 0x02, 'b', 'c']
 * words.decode(wb);                         // [["a", "bc"], 6]
 * ```
 */
export class ArrayCodec<T> extends Codec<ArrayCodec.Value<T>> {
	public readonly stride = -1;
	readonly #countCodec: Codec<number>;
	readonly #codec: Codec<T>;

	constructor(codecOrOptions: Codec<T> | ArrayOptions<T>) {
		super();
		if (codecOrOptions instanceof Codec) {
			this.#codec = codecOrOptions;
			this.#countCodec = varint;
		} else {
			this.#codec = codecOrOptions.codec;
			this.#countCodec = codecOrOptions.countCodec ?? varint;
		}
	}

	public get codec(): Codec<T> {
		return this.#codec;
	}

	public encode(value: ArrayCodec.Value<T>): Uint8Array {
		const parts: Uint8Array[] = [];

		for (const item of value) {
			const part = this.#codec.encode(item);
			parts.push(part);
		}

		const combinedLength = parts.reduce(
			(sum, part) => sum + part.length,
			0,
		);
		const elementsData = new Uint8Array(combinedLength);
		let offset = 0;
		for (const part of parts) {
			elementsData.set(part, offset);
			offset += part.length;
		}

		const countPrefix = this.#countCodec.encode(value.length);
		const result = new Uint8Array(countPrefix.length + elementsData.length);
		result.set(countPrefix, 0);
		result.set(elementsData, countPrefix.length);
		return result;
	}

	public decode(data: Uint8Array): [ArrayCodec.Value<T>, number] {
		const [count, bytesRead] = this.#countCodec.decode(data);
		const result: T[] = [];
		let offset = bytesRead;

		for (let i = 0; i < count; i++) {
			const [value, size] = this.#codec.decode(data.subarray(offset));
			result.push(value);
			offset += size;
		}

		return [result, offset];
	}
}

/**
 * Type definitions for Enum codec
 *
 * @example
 * ```ts
 * // Value<{ A: number, B: string }> -> { kind: "A", value: number } | ...
 * type E = Enum.Value<{ A: number, B: string }>;
 * ```
 */
export declare namespace EnumCodec {
	/**
	 * Tagged union type representing an enum variant
	 */
	export type Value<T extends Readonly<Record<string, unknown>>> = {
		[K in (keyof T)]: { kind: K; value: T[K] };
	}[(keyof T)];

	/**
	 * Infers the JavaScript tagged union type from a record of codecs
	 */
	export type Infer<T extends Readonly<Record<string, Codec<unknown>>>> = {
		[K in (keyof T)]: { kind: K; value: Codec.Infer<T[K]> };
	}[(keyof T)];

	/**
	 * Maps enum variants to their corresponding codecs
	 */
	export type Codecs<T extends Readonly<Record<string, unknown>>> =
		| { readonly [K in (keyof T)]: Codec<T[K]> }
		| { -readonly [K in (keyof T)]: Codec<T[K]> };
}

/**
 * Options for Enum codec.
 */
export type EnumOptions = {
	/** Codec for encoding the variant index. Default is u8 (1 byte). */
	indexCodec?: Codec<number>;
};

/**
 * Codec for tagged unions (enums).
 *
 * Variant index is determined by sorting variant names ascending
 * (Object.keys(variants).sort()).
 *
 * Encoding:
 * - Variant index (u8 by default, or custom indexCodec)
 * - payload: bytes encoded by the variant's codec
 *
 * Decoding returns { kind, value }.
 *
 * @template T - Record mapping variant names to codecs
 *
 * @example
 * ```ts
 * // Default: u8 for variant index
 * const MyEnum = new Enum({ A: u8, B: str } as const);
 * const b = MyEnum.encode({ kind: "B", value: "ok" });
 * const v = MyEnum.decode(b); // [{ kind: "B", value: "ok" }, size]
 *
 * @example
 * ```ts
 * // Custom index codec (e.g., u32 for large enums)
 * import { u32 } from "./primitives.ts";
 * const MyEnum = new Enum({ A: u8, B: str } as const, { indexCodec: u32 });
 * ```
 */
export class EnumCodec<const T extends Readonly<Record<string, unknown>>>
	extends Codec<EnumCodec.Value<T>> {
	public readonly stride = -1;
	public readonly variants: EnumCodec.Codecs<T>;
	readonly #indexCodec: Codec<number>;
	private readonly keys: (keyof T)[];

	constructor(variants: EnumCodec.Codecs<T>, options?: EnumOptions) {
		super();
		this.variants = variants;
		this.keys = Object.keys(variants).sort() as (keyof T)[];
		this.#indexCodec = options?.indexCodec ?? new U8Codec();
	}

	public encode(value: EnumCodec.Value<T>): Uint8Array {
		const index = this.keys.indexOf(value.kind);
		if (index === -1) {
			throw new Error(`Invalid enum variant: ${String(value.kind)}`);
		}
		const codec = this.variants[value.kind]!;
		const encodedValue = codec.encode(value.value as never);
		const indexBytes = this.#indexCodec.encode(index);
		const result = new Uint8Array(indexBytes.length + encodedValue.length);
		result.set(indexBytes, 0);
		result.set(encodedValue, indexBytes.length);
		return result;
	}

	public decode(data: Uint8Array): [EnumCodec.Value<T>, number] {
		const [index, indexSize] = this.#indexCodec.decode(data);
		if (index >= this.keys.length) {
			throw new Error(`Invalid enum index: ${index}`);
		}
		const key = this.keys[index]!;
		const codec = this.variants[key]!;
		const [value, size] = codec.decode(data.subarray(indexSize));
		return [{ kind: key, value } as never, indexSize + size];
	}
}

/**
 * Type definitions for Mapping codec
 *
 * @example
 * ```ts
 * // Infer<Str, U8> -> Map<string, number>
 * type M = Mapping.Infer<Str, U8>;
 * ```
 */
export declare namespace MappingCodec {
	/**
	 * Map from keys of type K to values of type V
	 */
	export type Value<K, V> = Map<K, V>;

	/**
	 * Infers the JavaScript Map type from key and value codecs
	 */
	export type Infer<K extends Codec<unknown>, V extends Codec<unknown>> = Map<
		Codec.Infer<K>,
		Codec.Infer<V>
	>;
}

/**
 * Options for Mapping codec.
 */
export type MappingOptions = {
	/** Codec for encoding the entry count. Default is varint. */
	countCodec?: Codec<number>;
};

/**
 * Codec for key-value mappings.
 *
 * Encoded as a Vector of Tuple [key, value].
 * - If [key,value] is fixed-stride: entries are concatenated (count implied)
 * - If variable: each entry is prefixed with a VarInt length (via Tuple rules)
 *
 * @template K - Key type
 * @template V - Value type
 *
 * @example
 * ```ts
 * // Default: varint count
 * const Dict = new Mapping(str, u8);
 * const map = new Map<string, number>([["x", 1], ["y", 2]]);
 * const b = Dict.encode(map);
 * const out = Dict.decode(b);   // [Map { "x" => 1, "y" => 2 }, size]
 *
 * @example
 * ```ts
 * // Custom count codec
 * import { u32 } from "./primitives.ts";
 * const Dict = new Mapping(str, u8, { countCodec: u32 });
 * ```
 */
export class MappingCodec<K, V> extends Codec<MappingCodec.Value<K, V>> {
	public readonly stride = -1;
	readonly #entriesCodec: ArrayCodec<[K, V]>;

	constructor(
		keyCodec: Codec<K>,
		valueCodec: Codec<V>,
		options?: MappingOptions,
	) {
		super();
		this.#entriesCodec = new ArrayCodec({
			codec: new TupleCodec([keyCodec, valueCodec]),
			countCodec: options?.countCodec,
		});
	}

	public encode(value: MappingCodec.Value<K, V>): Uint8Array {
		return this.#entriesCodec.encode(Array.from(value.entries()));
	}

	public decode(data: Uint8Array): [MappingCodec.Value<K, V>, number] {
		const [entries, size] = this.#entriesCodec.decode(data);
		return [new Map(entries), size];
	}
}
