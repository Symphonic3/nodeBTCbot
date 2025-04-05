const svgCaptcha = require('svg-captcha');
const crypto = require('crypto');
const sharp = require('sharp');

function captchaForUser(id) {
  // Generate captcha code
  const hash = crypto.createHash('sha256');
  const captchaString = Math.sqrt(parseInt(id) / parseInt(process.env.SALT1) + parseInt(process.env.SALT2));
  hash.update(captchaString.toString());
  const captchaCode = hash.digest('hex').substring(0, 8).toUpperCase();

  return captchaCode;
}

async function getCaptchaImage(text) {
  // Generate SVG captcha image using svg-captcha
  const captcha = svgCaptcha(text);

  // Convert the SVG to PNG using sharp
  const pngBuffer = await sharp(Buffer.from(captcha))
    .resize(600)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()  // Convert to PNG format
    .toBuffer();

  return pngBuffer;
}

module.exports = { captchaForUser, getCaptchaImage }