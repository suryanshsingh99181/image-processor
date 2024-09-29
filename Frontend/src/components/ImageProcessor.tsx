import React, { useEffect } from 'react';
import axios from 'axios';
import { useImageProcessor } from '../context/ImageProcessorContext';
import { toast } from 'react-toastify';

const ImageProcessor: React.FC = () => {
  const { image, preview, brightness, hue, saturation, rotation, format, setImage, setPreview,
    setBrightness, setHue, setSaturation, setRotation, setFormat } = useImageProcessor();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      const fileExtension = file.name.split('.').pop();
      setFormat(fileExtension ? fileExtension : 'jpeg'); // Set format based on file extension

      const formData = new FormData();
      formData.append('image', file);

      const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/upload`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!data.error) {
        setPreview(`${import.meta.env.VITE_BACKEND_URL}/uploads/${data.previewPath}`);
        setImage(`${import.meta.env.VITE_BACKEND_URL}/uploads/${data.previewPath}`); // used to reset back the changes
      }
    }
  };

  // Debounced effect 
  useEffect(() => {
    if (!image) return;

    const timeoutId = setTimeout(() => {
      handleProcess(); // Call after 500ms on subsequent changes
    }, 500);

    return () => clearTimeout(timeoutId); // Cleanup timeout on value change
  }, [brightness, hue, saturation, rotation, format]);

  const handleProcess = async () => {
    const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/process`, {
      brightness,
      hue,
      saturation,
      rotation,
      format
    }, { withCredentials: true });

    setPreview(`${import.meta.env.VITE_BACKEND_URL}/uploads/${data.previewPath}`);

    toast.success("Changes made ... ");
  };

  const handleResetChanges = () => {
    setBrightness(1);
    setHue(0);
    setRotation(0);
    setSaturation(1);

    setPreview(image);
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/download`, {
        params: {
          brightness,
          hue,
          saturation,
          rotation,
          format,
        },
        responseType: 'blob', // Download as blob
        withCredentials: true,
      });

      // Create a URL for the file and trigger download
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `processed-image.${format}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      toast.error('Error downloading the image.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      <div className="flex flex-col lg:flex-row lg:space-x-10 items-center bg-gray-800 shadow-2xl rounded-lg p-8 max-w-3xl w-full">
        
        {/* Image Section */}
        <div className="lg:w-1/2 mb-6 lg:mb-0">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              
              className="rounded-lg shadow-2xl w-full object-cover lg:max-w-sm"
            />
          ) : (
            <div className="text-gray-400 text-center ">
              No image selected
            </div>
          )}
        </div>
        
        {/* Controls Section */}
        <div className="lg:w-1/2 flex flex-col space-y-6">
          <h1 className="text-4xl pb-1 font-bold text-center lg:text-left bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Image Processor
          </h1>
          
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleImageUpload}
            className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500 rounded-lg w-full focus:outline-none focus:ring focus:ring-blue-500"
          />
          
          <div className="space-y-6">
            {/* Brightness */}
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-300">Brightness</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={brightness}
                onChange={e => setBrightness(parseFloat(e.target.value))}
                className="w-3/4 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            {/* Hue */}
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-300">Hue</label>
              <input
                type="range"
                min="0"
                max="400"
                step="1"
                value={hue}
                onChange={e => setHue(parseFloat(e.target.value))}
                className="w-3/4 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            {/* Saturation */}
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-300">Saturation</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={saturation}
                onChange={e => setSaturation(parseFloat(e.target.value))}
                className="w-3/4 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            {/* Rotation */}
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-300">Rotation</label>
              <input
                type="number"
                value={rotation}
                onChange={e => setRotation(parseFloat(e.target.value))}
                className="w-1/3 px-2 py-1 bg-gray-700 text-gray-300 border border-gray-500 rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
              />
            </div>
            
            {/* Format */}
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-300">Format</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="px-2 py-1 bg-gray-700 text-gray-300 border border-gray-500 rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="jpg">JPG</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex ">
            <button
              disabled={!image}
              onClick={handleResetChanges}
              className="w-full whitespace-nowrap px-2 mr-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-purple-300"
            >
              Reset Changes
            </button>

            <button
              disabled={!image}
              onClick={handleDownload}
              className="w-full whitespace-nowrap px-2 py-2 ml-1 bg-gradient-to-r from-green-400 via-teal-500 to-blue-500 text-white font-bold rounded-full shadow-lg hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-teal-300"
            >
              Download Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageProcessor;
