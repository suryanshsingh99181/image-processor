"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const { v4: uuidv4 } = require('uuid');
const cookieParser = require("cookie-parser");
const cors = require("cors");
let morgan = require("morgan");
const PORT = process.env.PORT || 5000;
const JWT_TOKEN = process.env.JWT_SECRET || "";
const app = (0, express_1.default)();
const utils_1 = require("./utils");
// console.log("JWT Secret:", JWT_TOKEN);
// middlewares
app.use(cookieParser());
// this is just a template i have saved from before for solving cors issues
app.use(cors({
    origin: (origin, cb) => {
        cb(null, origin); // origin can be undefined when the request is from the same origin
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(morgan("dev")); // gives data about incoming requests on console
// Middleware to handle JWT and UUID
const handleJWT = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.cookies.userToken;
    try {
        if (token) {
            // Verify the JWT
            const decoded = jsonwebtoken_1.default.verify(token, JWT_TOKEN);
            req.userId = decoded.userId;
        }
        else {
            // No JWT found, create a new UUID and JWT
            const newUserId = uuidv4();
            const newToken = jsonwebtoken_1.default.sign({ userId: newUserId }, JWT_TOKEN, { expiresIn: '7d' });
            // Store the new token in cookies
            res.cookie('userToken', newToken, { httpOnly: true, secure: false }); // Set secure: true for HTTPS
            // Attach user info to request
            req.userId = newUserId;
        }
        next();
    }
    catch (error) {
        console.log(error);
    }
});
app.use(handleJWT);
// Route to handle image upload
app.post('/upload', utils_1.upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const customReq = req;
    const userId = customReq.userId;
    if (!userId) {
        return res.status(401).send('User ID not found.');
    }
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const originalFilePath = path_1.default.join(__dirname, 'uploads', `${userId}-${req.file.filename}`);
    const previewFileName = `${userId}-preview-${req.file.filename}`;
    const previewFilePath = path_1.default.join(__dirname, 'uploads', previewFileName);
    // Delete old files with the same user ID prefix
    fs_1.default.readdirSync(path_1.default.join(__dirname, 'uploads')).forEach(file => {
        if (file.startsWith(userId === null || userId === void 0 ? void 0 : userId.toString())) {
            fs_1.default.unlinkSync(path_1.default.join(path_1.default.join(__dirname, 'uploads'), file));
        }
    });
    fs_1.default.renameSync(req.file.path, originalFilePath);
    yield (0, sharp_1.default)(originalFilePath)
        .resize(400, 400, { fit: "contain" }) // Process and resize for preview
        .toFile(previewFilePath);
    // Update user data with new image paths
    const userData = (0, utils_1.readUserData)();
    userData[userId === null || userId === void 0 ? void 0 : userId.toString()] = {
        originalImage: originalFilePath,
        previewImage: previewFilePath
    };
    // Write updated data back to JSON file
    (0, utils_1.writeUserData)(userData);
    res.json({ error: false, message: "image added to server temporarily", previewPath: previewFileName + `?t=${Date.now()}` });
}));
// Route for image manipulation (brightness, contrast, etc.)
app.post('/process', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { brightness = 1, hue = 0, saturation = 1, rotation = 0, format = "jpeg" } = req.body;
    const customReq = req;
    const userId = customReq.userId;
    if (!userId) {
        return res.status(401).send('User ID not found.');
    }
    // Retrieve user data to get original image path
    const userData = (0, utils_1.readUserData)();
    const userImageData = userData[userId === null || userId === void 0 ? void 0 : userId.toString()];
    if (!userImageData || !userImageData.originalImage) {
        return res.status(400).send('No image found for the user.');
    }
    const originalFilePath = userImageData.originalImage;
    const processedFileName = `${userId}_processedImage.${format}`;
    const processedFilePath = path_1.default.join(__dirname, 'uploads', processedFileName);
    try {
        // Check if the file already exists and delete it if so
        if (fs_1.default.existsSync(processedFilePath)) {
            fs_1.default.unlinkSync(processedFilePath);
        }
        // Process the image with Sharp
        yield (0, sharp_1.default)(originalFilePath)
            .rotate(parseFloat(rotation))
            .modulate({
            brightness: parseFloat(brightness),
            saturation: parseFloat(saturation),
            hue: parseFloat(hue),
        })
            .resize(400, 400, { fit: "contain" }) // Process and resize for preview
            .toFormat(format, { force: true })
            .toFile(processedFilePath);
        // Update user data with the new processed image path 
        userData[userId === null || userId === void 0 ? void 0 : userId.toString()] = Object.assign(Object.assign({}, userImageData), { previewImage: processedFilePath });
        (0, utils_1.writeUserData)(userData);
        // Send back the processed preview path
        res.json({ error: false, message: 'Image processed successfully', previewPath: processedFileName + `?t=${Date.now()}` });
    }
    catch (error) {
        console.error('Image processing failed:', error);
        res.status(500).send('Image processing failed.');
    }
}));
app.get('/download', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const customReq = req;
    const userId = customReq.userId;
    if (!userId) {
        return res.status(401).send('User ID not found.');
    }
    // Read user data to get the original image path
    const userData = (0, utils_1.readUserData)();
    const userImages = userData[userId.toString()];
    if (!userImages || !userImages.originalImage) {
        return res.status(404).send('Image not found.');
    }
    const { brightness = 1, hue = 0, saturation = 1, rotation = 0, format = "jpeg" } = req.query; // Parameters passed from the frontend
    const originalFilePath = userImages.originalImage; // Use the original image saved during upload
    // Ensure the file exists
    if (!fs_1.default.existsSync(originalFilePath)) {
        return res.status(404).send('File not found.');
    }
    // Create a temporary file for the processed image
    const processedFileName = `processed-${Date.now()}.${format}`; // Default to 'jpeg' if no format is provided
    const processedFilePath = path_1.default.join(__dirname, 'uploads', processedFileName);
    try {
        // Process the image with Sharp
        const brightnessValue = typeof brightness === 'string' ? parseFloat(brightness) : 1;
        const saturationValue = typeof saturation === 'string' ? parseFloat(saturation) : 1;
        const hueValue = typeof hue === 'string' ? parseFloat(hue) : 0;
        const rotationValue = typeof rotation === 'string' ? parseFloat(rotation) : 0;
        const validFormats = ['jpeg', 'png', 'jpg'];
        const formatValue = (typeof format === 'string' && validFormats.includes(format)) ? format : 'jpeg';
        yield (0, sharp_1.default)(originalFilePath)
            .rotate(rotationValue)
            .modulate({
            brightness: brightnessValue,
            saturation: saturationValue,
            hue: hueValue,
        })
            .toFormat(formatValue, { force: true })
            .toFile(processedFilePath);
        // Send the file for download
        res.download(processedFilePath, processedFileName, (err) => {
            // Delete the temporary file after the response is sent
            fs_1.default.unlinkSync(processedFilePath);
            if (err) {
                console.error('Error during file download:', err);
            }
        });
    }
    catch (error) {
        console.error('Error processing image:', error);
        return res.status(500).send('Error processing the image.');
    }
}));
app.use('/uploads', express_1.default.static('src/uploads')); // Serve static files from 'uploads' folder
// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
process.on("uncaughtException", (e) => console.log(e));
