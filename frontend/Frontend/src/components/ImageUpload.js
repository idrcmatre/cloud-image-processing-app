import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import ProgressBar from './ProgressBar';
import { getCurrentUserSession, refreshCognitoToken } from '../AuthService';//no need

const ImageUpload = ({ onUploadComplete, onUserUpdate, loadUserData, serverUrl, axiosInstance }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('');
    const socketRef = useRef(null);
    const [remainingUploads, setRemainingUploads] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';
        socketRef.current = io(WS_URL, {
            transports: ['websocket'],
            upgrade: false,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            randomizationFactor: 0.5,
            withCredentials: true
        });

        socketRef.current.on('connect', () => {
            console.log('Socket connected:', socketRef.current.id);
            // Add this line to register the user
            socketRef.current.emit('register', ['cognito:username']); // Make sure you have access to the username
        });

        socketRef.current.on('disconnect', () => {
            console.log('Socket disconnected. Attempting to reconnect...');
        });

        socketRef.current.on('progress', (data) => {
            console.log('Progress update received:', data);
            setProgress(data.progress);
            setStage(data.stage);
        });

        socketRef.current.io.on('reconnect', (attempt) => {
            console.log('Socket reconnected after ' + attempt + ' attempts');
            socketRef.current.emit('register', ['cognito:username']);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [['cognito:username']]); // Add username to the dependency array
    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
        setError(null);
    };

    const uploadToS3 = async (file) => {
        try {
            console.log('Attempting to get pre-signed URL for:', file.name);
            const { data: { uploadUrl } } = await axiosInstance.post('/api/image/get-s3-upload-url', {
                fileName: file.name,
                contentType: file.type
            });
            console.log('Received pre-signed URL:', uploadUrl);

            const response = await axios.put(uploadUrl, file, {
                headers: { 'Content-Type': file.type },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                    setStage(`Uploading ${file.name}: ${percentCompleted}%`);
                }
            });

            console.log(`File ${file.name} uploaded successfully to S3`);
            return file.name;
        } catch (error) {
            console.error(`Error uploading ${file.name} to S3:`, error);
            if (error.response && error.response.status === 403) {
                console.error('Access denied. Credentials might have expired.');
                // You could implement a retry mechanism here
            }
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) {
            setError('Please select at least one file to upload.');
            return;
        }
        setUploading(true);
        setError(null);
        setProgress(0);
        setStage('Starting upload...');

        try {
            const uploadedFileNames = await Promise.all(files.map(uploadToS3));
            console.log('Uploaded file names:', uploadedFileNames);

            const response = await axiosInstance.post('/api/image/process-bulk', { fileNames: uploadedFileNames });

            console.log('Processing complete. Server response:', response.data);
            if (response.data && response.data.results) {
                onUploadComplete(response.data.results);
                if (response.data.updatedUserInfo) {
                    console.log('Updated user info:', response.data.updatedUserInfo);
                    onUserUpdate(response.data.updatedUserInfo);
                }
                await loadUserData();
            } else {
                console.error('Unexpected response format:', response.data);
                setError('An error occurred while processing the images.');
            }
            setFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Upload error:', error);
            if (error.response && error.response.status === 401) {
                setError('Your session has expired. Please log in again.');
                // Trigger re-authentication here if you have a function for that
            } else if (error.message === 'Network Error') {
                setError('Connection lost. Please check your internet and try again.');
            } else {
                setError('An unexpected error occurred. Please try again later.');
            }
        } finally {
            setUploading(false);
        }
    };

    const testS3Upload = async () => {
        if (files.length === 0) {
            setError('Please select a file for S3 upload test.');
            return;
        }
        const file = files[0];
        setUploading(true);
        setError(null);
        setProgress(0);
        setStage('Starting S3 upload test...');

        try {
            console.log('Testing S3 upload for file:', file.name);

            const { data: { uploadUrl } } = await axiosInstance.post('/api/image/get-s3-upload-url', {
                fileName: file.name,
                contentType: file.type
            });
            console.log('Received pre-signed URL:', uploadUrl);
            setStage('Received pre-signed URL');
            setProgress(25);

            const s3UploadResponse = await axios.put(uploadUrl, file, {
                headers: { 'Content-Type': file.type },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`S3 Upload progress: ${percentCompleted}%`);
                    setProgress(25 + percentCompleted * 0.75);
                    setStage(`S3 Upload: ${percentCompleted}%`);
                }
            });
            console.log('S3 upload response:', s3UploadResponse);

            if (s3UploadResponse.status === 200) {
                console.log('File uploaded successfully to S3');
                setStage('S3 upload completed successfully');
                setProgress(100);
            } else {
                console.error('S3 upload failed with status:', s3UploadResponse.status);
                setStage('S3 upload failed');
                setError('S3 upload failed');
            }
        } catch (error) {
            console.error('Error in S3 upload test:', error);
            if (error.response && error.response.status === 401) {
                setError('Authentication failed. Please log in again.');
            } else {
                setError('S3 upload test failed: ' + (error.response?.data?.error || error.message));
            }
            setStage('S3 upload test error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-indigo-600">Upload Images</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="image" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 800x400px)</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            id="image"
                            onChange={handleFileChange}
                            multiple
                            accept="image/*"
                            className="hidden"
                        />
                    </label>
                </div>
                {files.length > 0 && (
                    <p className="text-sm text-gray-600">{files.length} file(s) selected</p>
                )}
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {uploading && (
                    <div className="space-y-2">
                        <ProgressBar progress={progress} />
                        <p className="text-sm text-gray-600">{stage}</p>
                    </div>
                )}
                <button
                    type="submit"
                    disabled={uploading || files.length === 0}
                    className={`w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition duration-300 ${(uploading || files.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {uploading ? 'Processing...' : 'Upload and Process'}
                </button>
            </form>
            {uploading && (
                <div className="mt-4">
                    <p>Current progress: {progress}%</p>
                    <p>Current stage: {stage}</p>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;