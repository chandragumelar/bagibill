// Scaling through the decimal string (pad, concatenate, BigInt-parse) keeps
// fractional values like 0.1 or 33.33 exact — multiplying the float by
// 10^decimalPlaces can drift for values that aren't exact in binary.
export function scaleDecimalToInteger(value: number, decimalPlaces: number): bigint {
  const text = value.toString();
  const [wholeDigits, fractionDigits = ""] = text.split(".");
  const paddedFraction = fractionDigits.padEnd(decimalPlaces, "0");
  const digits = `${wholeDigits}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  return BigInt(digits);
}
