// DownloadButton.js
import React, { useState } from 'react';

const DownloadButton = ({ fileName, axiosInstance, label }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!axiosInstance) {
            console.error('axiosInstance is not defined');
            alert('Unable to download file. Please try again later.');
            return;
        }

        setIsDownloading(true);
        try {
            console.log(`Requesting download URL for: ${fileName}`);
            const response = await axiosInstance.get(`/api/image/get-download-url/${encodeURIComponent(fileName)}`);
            const { downloadUrl } = response.data;
            console.log(`Received download URL: ${downloadUrl}`);

            // No need to fetch the file first since we're using CloudFront
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`Download initiated for: ${fileName}`);
        } catch (error) {
            console.error('Error during download:', error);
            alert('Failed to download file. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={!axiosInstance || isDownloading}
        >
            {isDownloading ? 'Downloading...' : label}
        </button>
    );
};

export default DownloadButton;