"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.storage = exports.writeUserData = exports.readUserData = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
// Helper functions to manage user data
const readUserData = () => {
    const filePath = path_1.default.join(__dirname, 'data', 'users.json');
    if (fs_1.default.existsSync(filePath)) {
        return JSON.parse(fs_1.default.readFileSync(filePath, 'utf8'));
    }
    return {};
};
exports.readUserData = readUserData;
const writeUserData = (data) => {
    const directory = path_1.default.join(__dirname, "data");
    const filePath = path_1.default.join(__dirname, 'data', 'users.json');
    if (!fs_1.default.existsSync(directory)) {
        fs_1.default.mkdirSync(directory, { recursive: true });
    }
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
exports.writeUserData = writeUserData;
// Multer setup for file uploads
exports.storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, '/uploads/');
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, 'image' + path_1.default.extname(file.originalname)); // naming it original
    }
});
exports.upload = (0, multer_1.default)({
    storage: exports.storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only jpeg|jpg|png images are allowed!'));
    }
});
