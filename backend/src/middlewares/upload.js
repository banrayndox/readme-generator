import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `repo-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.zip' && file.mimetype !== 'application/zip' && file.mimetype !== 'application/x-zip-compressed') {
    return cb(new Error('Only ZIP archive uploads are supported.'), false);
  }
  cb(null, true);
};

const maxUploadSize = parseInt(process.env.MAX_UPLOAD_SIZE || '52428800', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxUploadSize
  }
});

export default upload;
