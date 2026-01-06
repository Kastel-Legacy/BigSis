import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../api';

const PdfUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setMessage(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage({ type: 'error', text: 'Please select a PDF file first.' });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/ingest/pdf`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setMessage({ type: 'success', text: data.message || 'File uploaded successfully!' });
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                // Optional: Refresh document list trigger here
            } else {
                const errorData = await response.json();
                setMessage({ type: 'error', text: errorData.detail || 'Upload failed.' });
            }
        } catch (error) {
            console.error("Upload error:", error);
            setMessage({ type: 'error', text: 'Connection error.' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                    <UploadCloud className="text-purple-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Upload Documents</h3>
            </div>

            <div
                className={`
                    border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                    ${file ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                `}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                        setFile(e.dataTransfer.files[0]);
                        setMessage(null);
                    }
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload"
                />

                <label htmlFor="pdf-upload" className="cursor-pointer block">
                    {file ? (
                        <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                            <FileText size={48} className="text-purple-400" />
                            <div className="text-sm font-medium text-white">{file.name}</div>
                            <div className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                            <UploadCloud size={48} className="text-gray-600 mb-2" />
                            <span className="text-sm font-medium text-white">Click to upload</span>
                            <span className="text-xs">or drag and drop PDF here</span>
                        </div>
                    )}
                </label>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className={`
                        glass-button flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm
                        ${!file || uploading ? 'opacity-50 cursor-not-allowed' : 'text-white hover:text-purple-300'}
                    `}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            Uploading...
                        </>
                    ) : (
                        <>
                            Upload PDF
                            <UploadCloud size={16} />
                        </>
                    )}
                </button>
            </div>

            {message && (
                <div className={`
                    mt-4 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-2
                    ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}
                `}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default PdfUpload;

