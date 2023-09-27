// May also check if every element is a number <= 255 but
// it a little bit slower
export const isByteArray = (input: any): input is Uint8Array => {
  if (input == null || typeof input != 'object') return false;

  return isFinite(input.length) && input.length >= 0;
};
