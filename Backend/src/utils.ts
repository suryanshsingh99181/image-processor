import path from "path"
import fs from "fs"
import multer from "multer";

// Helper functions to manage user data
export const readUserData = () => {
    const filePath = path.join(__dirname, 'data', 'users.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return {};
};
  
export const writeUserData = (data: any) => {

  const directory = path.join(__dirname, "data")
    const filePath = path.join(__dirname, 'data', 'users.json');
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });

    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
  

// Multer setup for file uploads
export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '/uploads/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, 'image' + path.extname(file.originalname)); // naming it original
  }
});

export const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only jpeg|jpg|png images are allowed!'));
  }
});

