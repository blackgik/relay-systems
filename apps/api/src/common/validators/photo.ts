// Shared photo payload rules for shipment/custody uploads.
//
// Clients upload through the crop uploader, which emits PNG data URLs;
// hosted https URLs are also accepted (e.g. a receipt link). Anything
// else — bare filenames, javascript: URLs, html data URLs — is rejected
// at the DTO layer so junk never reaches storage or other clients' UIs.

export const PHOTO_PATTERN =
  /^(data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\s]+|https:\/\/\S+)$/;

/** Same ceiling the KYC document DTO enforces (~4MB of image data). */
export const MAX_PHOTO_LENGTH = 5_600_000;

export const PHOTO_MESSAGE = 'Each photo must be an uploaded image or an https image URL';
