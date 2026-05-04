// middleware/upload.js
const multer    = require('multer');
const multerS3  = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path      = require('path');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const imgOk   = /^(jpg|jpeg|png|webp)$/.test(ext);
  const videoOk = /^(mp4|mov|webm)$/.test(ext);
  if ((file.fieldname === 'images' && imgOk) || (file.fieldname === 'video' && videoOk))
    return cb(null, true);
  cb(new Error(`File type .${ext} not allowed`));
}

const storage = multerS3({
  s3,
  bucket: process.env.AWS_S3_BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  // Public read so URLs work directly in the browser
  acl: 'public-read',
  key(req, file, cb) {
    const folder = file.fieldname === 'video' ? 'videos' : 'images';
    const safe   = file.originalname.replace(/\s+/g, '-').toLowerCase();
    cb(null, `sarees/${folder}/${Date.now()}-${safe}`);
  },
});

module.exports = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });
