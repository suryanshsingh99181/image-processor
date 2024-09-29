import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define types for context state and functions
interface ImageProcessorContextType {
  image: string | null;
  preview: string | null;
  brightness: number;
  hue: number;
  saturation: number;
  rotation: number;
  format: string;
  setImage: (image: string | null) => void;
  setPreview: (preview: string | null) => void;
  setBrightness: (brightness: number) => void;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setRotation: (rotation: number) => void;
  setFormat: (format: string) => void;
}

const ImageProcessorContext = createContext<ImageProcessorContextType | undefined>(undefined);

export const ImageProcessorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number>(1);
  const [hue, setHue] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [format, setFormat] = useState<string>('jpeg'); // Default format

  return (
    <ImageProcessorContext.Provider
      value={{ image, preview, brightness, hue, saturation, rotation, format, setImage, setPreview, setBrightness, setHue, setSaturation, setRotation, setFormat }}
    >
      {children}
    </ImageProcessorContext.Provider>
  );
};

export const useImageProcessor = () => {
  const context = useContext(ImageProcessorContext);
  if (context === undefined) {
    throw new Error('useImageProcessor must be used within an ImageProcessorProvider');
  }
  return context;
};
