import { Codec, type FixedCodec, type Stride } from "./codec.ts";
import { U8Codec } from "./primitives.ts";
import { VarInt } from "./varint.ts";

// ── Nullable ──────────────────────────────────────────────────────────────────

/** Constraint type for the inner codec of {@link NullableCodec}. */
export type NullableGeneric = Codec;

/**
 * The input type accepted by a `NullableCodec<T>`:
 * either the inner codec's input type or `null`.
 */
export type NullableInput<T extends NullableGeneric> =
  | Codec.InferInput<T>
  | null;

/**
 * The decoded value type produced by a `NullableCodec<T>`:
 * either the inner codec's output type or `null`.
 */
export type NullableOutput<T extends NullableGeneric> =
  | Codec.InferOutput<T>
  | null;

/**
 * Codec for nullable values — either a present value or `null`.
 *
 * Wire format:
 * - flag byte `0x00` → `null`. If the inner codec is fixed-size, the remaining
 *   `stride.size - 1` bytes are zero-filled so the total size is always
 *   `1 + inner.stride.size`.
 * - flag byte `0x01` + payload → value encoded by the inner codec.
 * - All other flag byte values are invalid.
 *
 * When the inner codec is fixed-size the `NullableCodec` is also fixed-size
 * with `stride = { kind: "fixed", size: 1 + inner.stride.size }`.
 *
 * @template T - The inner codec type.
 *
 * @example
 * ```ts
 * import { NullableCodec, U8 } from "@nomadshiba/codec";
 *
 * const maybeU8 = new NullableCodec(U8);
 * maybeU8.encode(null); // Uint8Array [0x00, 0x00]  (flag + zero-padded)
 * maybeU8.encode(7);    // Uint8Array [0x01, 0x07]
 * maybeU8.decode(new Uint8Array([0x00, 0x00])); // [null, 2]
 * maybeU8.decode(new Uint8Array([0x01, 0x09])); // [9, 2]
 * ```
 */
export class NullableCodec<T extends NullableGeneric>
  extends Codec<NullableOutput<T>, NullableInput<T>> {
  public readonly inner: T;

  /**
   * `{ kind: "fixed", size: 1 + inner.stride.size }` when the inner codec is
   * fixed-size; `{ kind: "variable" }` otherwise.
   */
  public readonly stride: T["stride"] extends Stride<"fixed"> ? Stride<"fixed">
    : Stride<"variable">;

  /**
   * @param inner - The inner codec used to encode/decode the present value.
   */
  constructor(inner: T) {
    super();
    this.inner = inner;
    this.stride = (
      inner.stride.kind === "fixed"
        ? { kind: "fixed", size: 1 + inner.stride.size }
        : { kind: "variable" }
    ) as typeof this.stride;
  }

  /**
   * Encode a nullable value.
   *
   * @param value - The value to encode, or `null`.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>`.
   */
  public encode(
    value: NullableInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    if (value === null) {
      const size = this.stride.kind === "fixed" ? this.stride.size : 1;
      const result = target ?? new Uint8Array(size);
      result.fill(0, 0, size);
      return result;
    } else {
      const encoded = this.inner.encode(value, target?.subarray(1));
      const totalLen = 1 + encoded.length;
      const result = target ?? new Uint8Array(totalLen);
      result[0] = 1;
      result.set(encoded, 1);
      return result;
    }
  }

  /**
   * Decode a nullable value.
   *
   * @param data - Binary data starting with a flag byte.
   * @returns `[null, bytesConsumed]` or `[value, bytesConsumed]`.
   */
  public decode(data: Uint8Array): [NullableOutput<T>, number] {
    if (data[0] === 0) {
      const size = this.stride.kind === "fixed" ? this.stride.size : 1;
      return [null, size];
    } else {
      const [value, size] = this.inner.decode(data.subarray(1));
      return [value, 1 + size];
    }
  }
}

// ── Tuple ─────────────────────────────────────────────────────────────────────

/** Constraint type for the element array of a {@link TupleCodec}. */
export type TupleGeneric = readonly Codec[];

/**
 * Derives the input tuple type from a `TupleGeneric`:
 * maps each element codec type to its inferred input type.
 */
export type TupleInput<T extends TupleGeneric> = {
  -readonly [I in keyof T]: Codec.InferInput<T[I]>;
};

/**
 * Derives the decoded value tuple type from a `TupleGeneric`:
 * maps each element codec type to its inferred output type.
 */
export type TupleOutput<T extends TupleGeneric> = {
  -readonly [I in keyof T]: Codec.InferOutput<T[I]>;
};

/**
 * Codec for fixed-count tuples of potentially heterogeneous types.
 *
 * Elements are concatenated in order with no wrapper prefix. Each element
 * is self-delimiting: fixed-size elements use their `stride`, variable-size
 * elements encode their own size.
 *
 * `stride` is `{ kind: "fixed", size: n }` (sum of all element strides) when
 * all elements are fixed-size; `{ kind: "variable" }` if any element is
 * variable.
 *
 * @template T - Readonly array of element codec types.
 *
 * @example
 * ```ts
 * import { TupleCodec, U8, StringCodec } from "@nomadshiba/codec";
 *
 * const t = new TupleCodec([U8, new StringCodec()]);
 * t.encode([5, "hi"]); // Uint8Array [0x05, 0x02, 0x68, 0x69]
 * t.decode(enc);       // [[5, "hi"], 4]
 * ```
 */
export class TupleCodec<const T extends TupleGeneric>
  extends Codec<TupleOutput<T>, TupleInput<T>> {
  /**
   * The element codecs in definition order.
   */
  public readonly items: T;

  /**
   * `{ kind: "fixed", size: n }` when all elements have a fixed stride
   * (where `n` is their sum), or `{ kind: "variable" }` if any element is
   * variable-length.
   */
  public readonly stride: Stride<"variable"> extends T[number]["stride"]
    ? Stride<"variable">
    : Stride<"fixed">;

  /**
   * Factory function generated from the tuple arity.
   */
  private readonly factory: (...args: unknown[]) => TupleOutput<T>;

  /**
   * @param items - Ordered array of element codecs.
   */
  constructor(items: T) {
    super();
    this.items = items;
    const params = Array.from({ length: items.length }, (_, i) => `a${i}`);
    const body = `return [${params.join(", ")}];`;
    this.factory = new Function(...params, body) as typeof this.factory;
    let size = 0;
    let variable = false;
    for (const codec of items) {
      if (codec.stride.kind === "variable") {
        variable = true;
        break;
      }
      size += codec.stride.size;
    }
    this.stride =
      (variable
        ? { kind: "variable" }
        : { kind: "fixed", size }) as typeof this.stride;
  }

  /**
   * Encode a tuple of values by concatenating each element's encoding in order.
   *
   * @param value - Tuple of values, one per codec in order.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>`.
   */
  public encode(
    value: TupleInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const parts: Uint8Array<ArrayBuffer>[] = [];
    for (let i = 0; i < this.items.length; i++) {
      parts.push(this.items[i]!.encode(value[i]!));
    }
    const combinedLength = parts.reduce((sum, p) => sum + p.length, 0);
    const combined = target ?? new Uint8Array(combinedLength);
    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      combined.set(parts[i]!, offset);
      offset += parts[i]!.length;
    }
    return combined;
  }

  /**
   * Decode a tuple by reading each element in definition order.
   *
   * @param data - Binary data. Elements are read in definition order.
   * @returns `[tuple, totalBytesConsumed]`.
   */
  public decode(data: Uint8Array): [TupleOutput<T>, number] {
    const args: unknown[] = new Array(this.items.length);
    let offset = 0;
    for (let i = 0; i < this.items.length; i++) {
      const [value, size] = this.items[i]!.decode(data.subarray(offset));
      args[i] = value;
      offset += size;
    }
    return [this.factory(...args), offset];
  }
}

// ── Struct ────────────────────────────────────────────────────────────────────

/** Constraint type for the shape record of a {@link StructCodec}. */
export type StructGeneric = { readonly [key: string]: Codec };

/**
 * Extracts only the keys that end with `"?"` from a `StructGeneric`, stripped
 * of the suffix. These correspond to optional fields.
 */
type OptionalKeys<T extends StructGeneric> = {
  [K in Extract<keyof T, string>]: K extends `${infer Base}?` ? Base : never;
}[Extract<keyof T, string>];

/**
 * Extracts only the keys that do NOT end with `"?"` from a `StructGeneric`.
 * These correspond to required fields.
 */
type RequiredKeys<T extends StructGeneric> = {
  [K in Extract<keyof T, string>]: K extends `${string}?` ? never : K;
}[Extract<keyof T, string>];

/**
 * Resolves the codec for an optional key `Base` by looking up `"Base?"` in `T`.
 */
type OptionalCodecFor<
  T extends StructGeneric,
  Base extends string,
> = `${Base}?` extends keyof T ? T[`${Base}?`] : never;

/**
 * Derives the input object type from a `StructGeneric`, honoring `"field?"`
 * optional syntax.
 */
export type StructInput<T extends StructGeneric> =
  & { -readonly [K in RequiredKeys<T>]: Codec.InferInput<T[K]> }
  & {
    -readonly [K in OptionalKeys<T>]?: Codec.InferInput<
      OptionalCodecFor<T, K>
    >;
  };

/**
 * Derives the decoded object type from a `StructGeneric`, honoring `"field?"`
 * optional syntax.
 */
export type StructOutput<T extends StructGeneric> =
  & { -readonly [K in RequiredKeys<T>]: Codec.InferOutput<T[K]> }
  & {
    -readonly [K in OptionalKeys<T>]?: Codec.InferOutput<
      OptionalCodecFor<T, K>
    >;
  };

/**
 * Transforms a `StructGeneric` shape into its fully-optional equivalent.
 */
export type PartialShape<T extends StructGeneric> = {
  [K in Extract<keyof T, string> as K extends `${string}?` ? K : `${K}?`]: T[K];
};

/**
 * Codec for named-field objects, with support for optional fields via the
 * `"field?"` key syntax.
 *
 * Internally backed by a {@link TupleCodec} keyed on the field names in
 * **definition order**. The binary layout is identical to the equivalent
 * tuple — field names are not part of the wire format.
 *
 * Optional fields (keys ending with `"?"`) are prefixed with a presence byte
 * in the wire format:
 * - `0x00` → field is absent (`undefined`)
 * - `0x01` + payload → field is present, encoded by its inner codec
 *
 * **Reordering fields changes the binary layout** and breaks compatibility
 * with previously encoded data.
 *
 * @template T - Record mapping field names to codecs. Append `"?"` to a key
 *   to mark that field as optional.
 *
 * @example
 * ```ts
 * import { StructCodec, U32, U8, StringCodec } from "@nomadshiba/codec";
 *
 * const User = new StructCodec({
 *   id: U32,
 *   name: new StringCodec(),
 *   "age?": U8,
 * });
 *
 * User.encode({ id: 1, name: "Ada" });
 * User.decode(bin); // [{ id: 1, name: "Ada" }, size]
 * ```
 */
export class StructCodec<const T extends StructGeneric>
  extends Codec<StructOutput<T>, StructInput<T>> {
  public readonly stride: Stride<"variable"> extends T[keyof T]["stride"]
    ? Stride<"variable">
    : `${string}?` extends keyof T ? Stride<"variable">
    : Stride<"fixed">;

  public readonly shape: T;

  protected readonly keys: Extract<keyof T, string>[];
  private readonly factory: ((...args: unknown[]) => StructOutput<T>) | null;
  private readonly optionalFactories:
    | Map<bigint, (...args: unknown[]) => StructOutput<T>>
    | null;
  private readonly requiredKeys: Extract<keyof T, string>[];
  private readonly optionalKeys: Extract<keyof T, string>[];
  private readonly optionalBits: bigint[];

  /**
   * @param shape - Record mapping field names to their codecs, in definition
   *   order. Append `"?"` to a key name to mark that field as optional.
   */
  constructor(shape: T) {
    super();
    this.shape = shape;
    this.keys = Object.keys(shape) as typeof this.keys;

    this.requiredKeys = this.keys.filter((k) => !k.endsWith("?"));
    this.optionalKeys = this.keys.filter((k) => k.endsWith("?"));

    const hasOptional = this.optionalKeys.length > 0;
    if (hasOptional) {
      this.factory = null;
      this.optionalFactories = new Map();
    } else {
      const keys = this.keys;
      const body = `return { ${keys.join(", ")} };`;
      this.factory = new Function(...keys, body) as typeof this.factory;
      this.optionalFactories = null;
    }

    let optIdx = 0n;
    this.optionalBits = this.keys.map((k) =>
      k.endsWith("?") ? 1n << optIdx++ : 0n
    );

    let size = 0;
    let variable = hasOptional;
    if (!variable) {
      for (const key of this.keys) {
        const s = shape[key]!.stride;
        if (s.kind === "variable") {
          variable = true;
          break;
        }
        size += s.size;
      }
    }
    this.stride =
      (variable
        ? { kind: "variable" }
        : { kind: "fixed", size }) as typeof this.stride;
  }

  /**
   * Encode a struct value by concatenating each field's encoding in definition order.
   *
   * @param value - Object with fields matching the codec shape.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>`.
   */
  public encode(
    value: StructInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const parts: Uint8Array<ArrayBuffer>[] = [];

    for (let i = 0; i < this.keys.length; i++) {
      const rawKey = this.keys[i]!;
      const codec = this.shape[rawKey]!;

      if (rawKey.endsWith("?")) {
        const fieldKey = rawKey.slice(0, -1) as keyof typeof value;
        const fieldValue = value[fieldKey];

        if (fieldValue === undefined) {
          parts.push(new Uint8Array([0x00]));
        } else {
          const encoded = codec.encode(fieldValue);
          const presenced = new Uint8Array(1 + encoded.length);
          presenced[0] = 0x01;
          presenced.set(encoded, 1);
          parts.push(presenced);
        }
      } else {
        parts.push(codec.encode(value[rawKey as never]));
      }
    }

    const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
    const result = target ?? new Uint8Array(totalLen);
    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      result.set(parts[i]!, offset);
      offset += parts[i]!.length;
    }
    return result;
  }

  /**
   * Decode a struct by reading each field in definition order.
   *
   * @param data - Binary data.
   * @returns `[object, bytesConsumed]`.
   */
  public decode(data: Uint8Array): [StructOutput<T>, number] {
    let offset = 0;

    if (this.factory !== null) {
      const args: unknown[] = new Array(this.keys.length);
      for (let i = 0; i < this.keys.length; i++) {
        const codec = this.shape[this.keys[i]!];
        const [fieldValue, size] = codec.decode(data.subarray(offset));
        args[i] = fieldValue;
        offset += size;
      }
      return [this.factory(...args), offset];
    }

    const reqLen = this.requiredKeys.length;
    const reqArgs: unknown[] = new Array(reqLen);
    const optArgs: unknown[] = [];
    let mask = 0n;
    let reqIdx = 0;

    for (let i = 0; i < this.keys.length; i++) {
      const rawKey = this.keys[i]!;
      const codec = this.shape[rawKey]!;

      if (rawKey.endsWith("?")) {
        const presenceByte = data[offset]!;
        offset += 1;

        if (presenceByte !== 0x00) {
          const [fieldValue, size] = codec.decode(data.subarray(offset));
          optArgs.push(fieldValue);
          mask |= this.optionalBits[i]!;
          offset += size;
        }
      } else {
        const [fieldValue, size] = codec.decode(data.subarray(offset));
        reqArgs[reqIdx] = fieldValue;
        reqIdx++;
        offset += size;
      }
    }

    let factory = this.optionalFactories!.get(mask);
    if (factory === undefined) {
      const reqParams = this.requiredKeys;
      const optParams: string[] = [];
      const optLen = this.optionalKeys.length;
      for (let i = 0; i < optLen; i++) {
        if (mask & (1n << BigInt(i))) {
          optParams.push(this.optionalKeys[i]!.slice(0, -1));
        }
      }
      const allParams = [...reqParams, ...optParams];
      const body = `return { ${allParams.join(", ")} };`;
      factory = new Function(...allParams, body) as (
        ...args: unknown[]
      ) => StructOutput<T>;
      this.optionalFactories!.set(mask, factory);
    }

    return [factory(...reqArgs, ...optArgs), offset];
  }

  /**
   * Returns a new `StructCodec` where every field is optional.
   *
   * @returns `StructCodec<PartialShape<T>>`
   */
  public partial(): StructCodec<PartialShape<T>> {
    const partialShape: { [key: string]: Codec } = {};
    for (const rawKey of this.keys) {
      const optKey = rawKey.endsWith("?") ? rawKey : `${rawKey}?`;
      partialShape[optKey] = this.shape[rawKey]!;
    }
    return new StructCodec(partialShape) as never;
  }
}

// ── Array ─────────────────────────────────────────────────────────────────────

/** Constraint type for the element codec of an {@link ArrayCodec}. */
export type ArrayGeneric = Codec;

/**
 * The input type accepted by an `ArrayCodec<T>`:
 * an array of the inner codec's input type.
 */
export type ArrayInput<T extends ArrayGeneric> = Codec.InferInput<T>[];

/**
 * The decoded value type produced by an `ArrayCodec<T>`:
 * an array of the inner codec's output type.
 */
export type ArrayOutput<T extends ArrayGeneric> = Codec.InferOutput<T>[];

/**
 * Options for {@link ArrayCodec}.
 */
export type ArrayOptions = {
  /**
   * Codec used to encode the element count prefix. Defaults to
   * {@link VarInt}.
   */
  counter?: Codec<number>;
};

/**
 * Codec for variable-length arrays of a single element type.
 *
 * Wire format: `<count> <elem0> <elem1> …` where `<count>` is encoded by
 * `counter` (default: {@link VarInt}). Elements are concatenated in order;
 * each element is self-delimiting.
 *
 * Always variable-length (`stride = { kind: "variable" }`).
 *
 * @template T - Element codec type.
 *
 * @example
 * ```ts
 * import { ArrayCodec, U16, U32 } from "@nomadshiba/codec";
 *
 * const nums = new ArrayCodec(U16);
 * nums.encode([1, 513]); // Uint8Array [0x02, 0x00, 0x01, 0x02, 0x01]
 * ```
 */
export class ArrayCodec<T extends ArrayGeneric>
  extends Codec<ArrayOutput<T>, ArrayInput<T>> {
  /** Always `{ kind: "variable" }`. */
  public readonly stride: Stride<"variable"> = { kind: "variable" };
  /**
   * The codec used to encode the element count prefix.
   * Defaults to {@link VarInt}.
   */
  public readonly counter: Codec<number>;
  /**
   * The codec used to encode/decode each individual array element.
   */
  public readonly item: T;

  /**
   * @param item - The element codec.
   * @param options - Optional configuration for the count prefix codec.
   */
  constructor(item: T, options?: ArrayOptions) {
    super();
    this.item = item;
    this.counter = options?.counter ?? VarInt;
  }

  /**
   * Encode an array by writing a count prefix followed by each element.
   *
   * @param value - Array of elements to encode.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>`.
   */
  public encode(
    value: ArrayInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const parts: Uint8Array<ArrayBuffer>[] = [];
    for (const item of value) {
      parts.push(this.item.encode(item));
    }

    const combinedLength = parts.reduce((sum, p) => sum + p.length, 0);
    const countPrefix = this.counter.encode(value.length);
    const totalLen = countPrefix.length + combinedLength;
    const result = target ?? new Uint8Array(totalLen);
    result.set(countPrefix, 0);

    let offset = countPrefix.length;
    for (let i = 0; i < parts.length; i++) {
      result.set(parts[i]!, offset);
      offset += parts[i]!.length;
    }
    return result;
  }

  /**
   * Decode an array by reading the count prefix then decoding that many elements.
   *
   * @param data - Binary data starting with a count prefix.
   * @returns `[elements, totalBytesConsumed]`.
   */
  public decode(data: Uint8Array): [ArrayOutput<T>, number] {
    const [count, bytesRead] = this.counter.decode(data);
    const result: ArrayOutput<T> = [];
    let offset = bytesRead;

    for (let i = 0; i < count; i++) {
      const [value, size] = this.item.decode(data.subarray(offset));
      result.push(value);
      offset += size;
    }

    return [result, offset];
  }
}

// ── Enum ──────────────────────────────────────────────────────────────────────

/** Constraint type for the variants record of a {@link EnumCodec}. */
export type EnumGeneric = { readonly [key: string]: Codec };

/**
 * The input type accepted by a `EnumCodec<T>`: a discriminated union
 * where each member has a `kind` (the variant name) and a `value`.
 */
export type EnumInput<T extends EnumGeneric> = {
  -readonly [K in keyof T]: {
    kind: K;
    value: Codec.InferInput<T[K]>;
  };
}[keyof T];

/**
 * The decoded value type produced by a `EnumCodec<T>`: a discriminated union
 * where each member has a `kind` (the variant name) and a `value`.
 */
export type EnumOutput<T extends EnumGeneric> = {
  -readonly [K in keyof T]: {
    kind: K;
    value: Codec.InferOutput<T[K]>;
  };
}[keyof T];

/**
 * Options for {@link EnumCodec}.
 */
export type EnumOptions = {
  /**
   * Codec used to encode the variant index. Defaults to `U8` (1 byte,
   * supporting up to 256 variants).
   */
  indexer?: Codec<number>;
};

/**
 * Codec for tagged unions.
 *
 * Variant indices are assigned in definition order.
 * Wire format: `<index> <payload>`.
 *
 * @template T - Record mapping variant names to codecs.
 *
 * @example
 * ```ts
 * import { EnumCodec, U8, StringCodec } from "@nomadshiba/codec";
 *
 * const Event = new EnumCodec({ Click: U8, Message: new StringCodec() });
 * Event.encode({ kind: "Click", value: 5 });
 * const [e] = Event.decode(bytes); // { kind: "Click", value: 5 }
 * ```
 */
export class EnumCodec<const T extends EnumGeneric>
  extends Codec<EnumOutput<T>, EnumInput<T>> {
  /** Always `{ kind: "variable" }`. */
  public readonly stride: Stride<"variable"> = { kind: "variable" };

  public readonly variants: T;
  public readonly indexer: Codec<number>;
  private readonly keys: (keyof T)[];

  constructor(variants: T, options?: EnumOptions) {
    super();
    this.variants = variants;
    this.keys = Object.keys(this.variants) as (keyof T)[];
    this.indexer = options?.indexer ?? new U8Codec();
  }

  public encode(
    value: EnumInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const index = this.keys.indexOf(value.kind);
    if (index === -1) {
      throw new Error(`Invalid union variant: ${String(value.kind)}`);
    }
    const codec = this.variants[value.kind]!;
    const encodedValue = codec.encode(value.value as never);
    const indexBytes = this.indexer.encode(index);
    const totalLen = indexBytes.length + encodedValue.length;
    const result = target ?? new Uint8Array(totalLen);
    result.set(indexBytes, 0);
    result.set(encodedValue, indexBytes.length);
    return result;
  }

  public decode(data: Uint8Array): [EnumOutput<T>, number] {
    const [index, indexSize] = this.indexer.decode(data);
    if (index >= this.keys.length) {
      throw new Error(`Invalid union index: ${index}`);
    }
    const key = this.keys[index]!;
    const codec = this.variants[key]!;
    const [value, size] = codec.decode(data.subarray(indexSize));
    return [{ kind: key, value } as never, indexSize + size];
  }
}

// ── FixedEnum ─────────────────────────────────────────────────────────────────

/** Constraint type for the variants record of a {@link PaddedEnumCodec}: all variants must be fixed-size. */
export type FixedEnumGeneric = {
  readonly [key: string]: FixedCodec;
};

/**
 * Options for {@link PaddedEnumCodec}.
 */
export type FixedEnumOptions = {
  /**
   * Codec used to encode the variant index. Must be fixed-size. Defaults to `U8`.
   */
  indexer?: FixedCodec<number>;
};

/**
 * A fixed-size variant of {@link EnumCodec}.
 *
 * All variant codecs must be fixed-size. Shorter variant payloads are
 * zero-padded to `maxVariantSize` bytes.
 *
 * Wire format: `<index> <payload padded to maxVariantSize>`
 *
 * @template T - Record mapping variant names to fixed-size codecs.
 *
 * @example
 * ```ts
 * import { PaddedEnumCodec, U8, U16 } from "@nomadshiba/codec";
 *
 * const Event = new PaddedEnumCodec({ Click: U8, Scroll: U16 });
 * Event.encode({ kind: "Click", value: 5 });    // [0x00, 0x05, 0x00]
 * Event.encode({ kind: "Scroll", value: 300 }); // [0x01, 0x01, 0x2c]
 * ```
 */
export class PaddedEnumCodec<const T extends FixedEnumGeneric>
  extends Codec<EnumOutput<T>, EnumInput<T>> {
  public readonly stride: Stride<"fixed">;
  public readonly variants: T;
  public readonly indexer: FixedCodec<number>;
  public readonly maxVariantSize: number;
  private readonly keys: (keyof T)[];

  constructor(variants: T, options?: FixedEnumOptions) {
    super();
    this.variants = variants;
    this.keys = Object.keys(this.variants) as (keyof T)[];
    this.indexer = options?.indexer ?? new U8Codec();

    for (const key of this.keys) {
      const codec = this.variants[key]!;
      if (codec.stride.kind !== "fixed") {
        throw new Error(
          `PaddedEnumCodec: variant "${String(key)}" must have a fixed-size codec`,
        );
      }
    }

    if (this.indexer.stride.kind !== "fixed") {
      throw new Error("PaddedEnumCodec: indexer must have a fixed-size codec");
    }

    this.maxVariantSize = this.keys.reduce<number>((max, key) => {
      const s = (this.variants[key as string]!.stride as Stride<"fixed">).size;
      return s > max ? s : max;
    }, 0);

    this.stride = {
      kind: "fixed",
      size: this.indexer.stride.size + this.maxVariantSize,
    };
  }

  public encode(
    value: EnumInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const index = this.keys.indexOf(value.kind);
    if (index === -1) {
      throw new Error(`Invalid union variant: ${String(value.kind)}`);
    }
    const codec = this.variants[value.kind]!;
    const indexBytes = this.indexer.encode(index);
    const result = target ?? new Uint8Array(this.stride.size);
    result.set(indexBytes, 0);
    codec.encode(
      value.value as never,
      result.subarray(indexBytes.length) as Uint8Array<ArrayBuffer>,
    );
    return result;
  }

  public decode(data: Uint8Array): [EnumOutput<T>, number] {
    const indexSize = this.indexer.stride.size;
    const [index] = this.indexer.decode(data);
    if (index >= this.keys.length) {
      throw new Error(`Invalid union index: ${index}`);
    }
    const key = this.keys[index]!;
    const codec = this.variants[key]!;
    const [value] = codec.decode(data.subarray(indexSize));
    return [{ kind: key, value } as never, this.stride.size];
  }
}

// ── Mapping ───────────────────────────────────────────────────────────────────

/** Constraint type for the `[keyCodec, valueCodec]` pair of a {@link MappingCodec}. */
export type MappingGeneric = readonly [Codec, Codec];

/**
 * The input type accepted by a `MappingCodec<T>`.
 */
export type MappingInput<T extends MappingGeneric> = Map<
  Codec.InferInput<T[0]>,
  Codec.InferInput<T[1]>
>;

/**
 * The decoded value type produced by a `MappingCodec<T>`.
 */
export type MappingOutput<T extends MappingGeneric> = Map<
  Codec.InferOutput<T[0]>,
  Codec.InferOutput<T[1]>
>;

/**
 * Options for {@link MappingCodec}.
 */
export type MappingOptions = {
  /**
   * Codec used to encode the entry count. Defaults to {@link VarInt}.
   */
  counter?: Codec<number>;
};

/**
 * Codec for `Map<K, V>` instances.
 *
 * Wire format: `<count> <key0> <value0> <key1> <value1> …`
 *
 * @template T - Readonly tuple `[keyCodec, valueCodec]`.
 *
 * @example
 * ```ts
 * import { MappingCodec, StringCodec, U8 } from "@nomadshiba/codec";
 *
 * const Dict = new MappingCodec([new StringCodec(), U8]);
 * const map = new Map([["x", 1], ["y", 2]]);
 * Dict.decode(Dict.encode(map)); // [Map { "x" => 1, "y" => 2 }, size]
 * ```
 */
export class MappingCodec<const T extends MappingGeneric>
  extends Codec<MappingOutput<T>, MappingInput<T>> {
  /** Always `{ kind: "variable" }`. */
  public readonly stride: Stride<"variable"> = { kind: "variable" };
  readonly #entriesCodec: ArrayCodec<TupleCodec<T>>;

  public get entryCodec(): T {
    return this.#entriesCodec.item.items;
  }

  constructor(entryCodec: T, options?: MappingOptions) {
    super();
    this.#entriesCodec = new ArrayCodec(new TupleCodec(entryCodec), options);
  }

  public encode(
    value: MappingInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    return this.#entriesCodec.encode(
      value.entries().toArray() as never,
      target,
    );
  }

  public decode(data: Uint8Array): [MappingOutput<T>, number] {
    const [entries, size] = this.#entriesCodec.decode(data);
    return [new Map(entries), size];
  }
}
