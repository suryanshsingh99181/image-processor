import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import dotenv from "dotenv"
dotenv.config()
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
const { v4 : uuidv4 } = require( 'uuid');
const cookieParser = require("cookie-parser");
const cors = require("cors");
let morgan = require("morgan");


const PORT = process.env.PORT  || 5000
const JWT_TOKEN = process.env.JWT_SECRET || ""

const app = express();

import {  writeUserData, readUserData, storage, upload } from './utils';


interface CustomRequest extends Request {
  userId: string | JwtPayload;
}
interface CustomJwtPayload extends JwtPayload {
  userId: string;
}
// console.log("JWT Secret:", JWT_TOKEN);


// middlewares
app.use(cookieParser());

// this is just a template i have saved from before for solving cors issues
app.use(
  cors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean | string) => void) => {
      cb(null, origin); // origin can be undefined when the request is from the same origin
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan("dev")); // gives data about incoming requests on console

// Middleware to handle JWT and UUID
const handleJWT = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.userToken;

  try {
    
    if (token) {
      // Verify the JWT

        const decoded =  jwt.verify(token, JWT_TOKEN);
        (req as CustomRequest).userId = (decoded as CustomJwtPayload).userId
      
      
    } else {
      // No JWT found, create a new UUID and JWT
      const newUserId = uuidv4();



      const newToken = jwt.sign({ userId: newUserId }, JWT_TOKEN , { expiresIn: '7d' });
  
      // Store the new token in cookies
      res.cookie('userToken', newToken, { httpOnly: true, secure: false }); // Set secure: true for HTTPS
  
      // Attach user info to request
      (req as CustomRequest).userId = newUserId;

    }

    next()
  } catch (error) {
    console.log(error)
  }

  
};
app.use(handleJWT);


// Route to handle image upload

app.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  const customReq = req as CustomRequest;
  const userId = customReq.userId;

  if (!userId) {
    return res.status(401).send('User ID not found.');
  }

  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const originalFilePath = path.join(__dirname, 'uploads', `${userId}-${req.file.filename}`);
  const previewFileName = `${userId}-preview-${req.file.filename}`;
  const previewFilePath = path.join(__dirname, 'uploads', previewFileName);


  // Delete old files with the same user ID prefix
  fs.readdirSync(path.join(__dirname, 'uploads')).forEach(file => {
    if (file.startsWith(userId?.toString())) {
      fs.unlinkSync(path.join(path.join(__dirname, 'uploads'), file));
    }
  });


  fs.renameSync(req.file.path, originalFilePath);

  await sharp(originalFilePath)
  .resize(400,400, {fit : "contain"} ) // Process and resize for preview
  .toFile(previewFilePath)
    

  // Update user data with new image paths
  const userData = readUserData();
  userData[userId?.toString()] = {
    originalImage: originalFilePath,
    previewImage: previewFilePath
  };

  // Write updated data back to JSON file
  writeUserData(userData);
  

  res.json({error : false, message : "image added to server temporarily", previewPath : previewFileName + `?t=${Date.now()}`})

});


// Route for image manipulation (brightness, contrast, etc.)
app.post('/process', async (req: Request, res: Response) => {
  const { brightness = 1, hue = 0, saturation = 1, rotation = 0, format = "jpeg" } = req.body;

  const customReq = req as CustomRequest;
  const userId = customReq.userId;

  if (!userId) {
    return res.status(401).send('User ID not found.');
  }

  // Retrieve user data to get original image path
  const userData = readUserData();
  const userImageData = userData[userId?.toString()];

  if (!userImageData || !userImageData.originalImage) {
    return res.status(400).send('No image found for the user.');
  }

  const originalFilePath = userImageData.originalImage;
  const processedFileName = `${userId}_processedImage.${format}`;
  const processedFilePath = path.join(__dirname, 'uploads', processedFileName);

  try {
    // Check if the file already exists and delete it if so
    if (fs.existsSync(processedFilePath)) {
      fs.unlinkSync(processedFilePath);
    }

    // Process the image with Sharp
    await sharp(originalFilePath)
      .rotate(parseFloat(rotation))
      .modulate({
        brightness: parseFloat(brightness),
        saturation: parseFloat(saturation),
        hue: parseFloat(hue),
      
      })
      .resize(400,400, {fit : "contain"} ) // Process and resize for preview
      .toFormat(format, {force : true})
      .toFile(processedFilePath);

    // Update user data with the new processed image path 
    userData[userId?.toString()] = {
      ...userImageData, // Keep original image reference
      previewImage: processedFilePath, // Update with the new processed image path
    };

    writeUserData(userData);

    // Send back the processed preview path
    res.json({ error: false, message: 'Image processed successfully', previewPath: processedFileName  +`?t=${Date.now()}`  });

  } catch (error) {
    console.error('Image processing failed:', error);
    res.status(500).send('Image processing failed.');
  }
});


app.get('/download', async (req: Request, res: Response) => {
  const customReq = req as CustomRequest;
  const userId = customReq.userId;

  if (!userId) {
    return res.status(401).send('User ID not found.');
  }

  // Read user data to get the original image path
  const userData = readUserData();
  const userImages = userData[userId.toString()];

  if (!userImages || !userImages.originalImage) {
    return res.status(404).send('Image not found.');
  }

  const { brightness = 1, hue = 0, saturation = 1, rotation = 0, format = "jpeg" } = req.query; // Parameters passed from the frontend
  const originalFilePath = userImages.originalImage; // Use the original image saved during upload

  // Ensure the file exists
  if (!fs.existsSync(originalFilePath)) {
    return res.status(404).send('File not found.');
  }

  // Create a temporary file for the processed image
  const processedFileName = `processed-${Date.now()}.${format}`;  // Default to 'jpeg' if no format is provided
  const processedFilePath = path.join(__dirname, 'uploads', processedFileName);

  try {

    // Process the image with Sharp
    const brightnessValue = typeof brightness === 'string' ? parseFloat(brightness) : 1;
    const saturationValue = typeof saturation === 'string' ? parseFloat(saturation) : 1;
    const hueValue = typeof hue === 'string' ? parseFloat(hue) : 0;
    const rotationValue = typeof rotation === 'string' ? parseFloat(rotation) : 0;

    const validFormats = ['jpeg', 'png', 'jpg'];
    const formatValue = (typeof format === 'string' && validFormats.includes(format)) ? format : 'jpeg';

    await sharp(originalFilePath)
      .rotate(rotationValue)
      .modulate({
        brightness: brightnessValue,
        saturation: saturationValue,
        hue: hueValue,
      })
      .toFormat(formatValue as keyof sharp.FormatEnum, { force: true })
      .toFile(processedFilePath);
    

    // Send the file for download
    res.download(processedFilePath, processedFileName,  (err) => {
      // Delete the temporary file after the response is sent
      fs.unlinkSync(processedFilePath);
      if (err) {
        console.error('Error during file download:', err);
      }
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).send('Error processing the image.');
  }
});


app.use('/uploads', express.static('src/uploads')); // Serve static files from 'uploads' folder

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


process.on("uncaughtException", (e)=>console.log(e))