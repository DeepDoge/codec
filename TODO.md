## GOALS for 0.3.0

- [ ] Differentiate between dynamic sized `Codec` and fixed sized `Codec` on the
      type level as well.
- [ ] Rename `stride` to `size`.
- [ ] Rename `lengthCodec` to `sizeCodec` or other names that fits the specific
      codec better.
- [ ] Rename `TupleCodec.codecs` to `TupleCodec.itemCodecs`.
- [ ] Rename `ArrayCodec.codec` to `ArrayCodec.itemCodec`.
- [ ] Rename union back to enum.
- [ ] Have alternatives for fixed sized enums. using the max size.
- [ ] Make `NullableCodec` add 1 byte to the size and if the inner is fixed stay
      fixed.
- [ ] Don't sort enum variants by key.
