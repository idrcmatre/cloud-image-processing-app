// ImageResults.js
import React from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import DownloadButton from './DownloadButton';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

React.useEffect(() => {
    if (results && results.length > 0) {
        console.log('Results:', results);
        results.forEach((item, index) => {
            console.log(`Image ${index + 1} URLs:`, {
                original: item.originalImageUrl,
                enhanced: item.enhancedImageUrl
            });
        });
    }
}, [results]);

const ImageResults = ({ results, axiosInstance }) => {
    const displayClassification = (classification, title) => {
        const data = {
            labels: classification.map(c => c.className),
            datasets: [
                {
                    label: 'Probability',
                    data: classification.map(c => c.probability * 100),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                },
            ],
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: title },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Probability (%)' }
                },
                x: {
                    display: false // Hide x-axis labels
                }
            },
        };

        return (
            <div className="space-y-4">
                <div style={{ height: '300px' }}>
                    <Bar data={data} options={options} />
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${classification.length}, 1fr)` }}>
                    {classification.map((c, index) => (
                        <div key={index} className="text-center">
                            <div className="text-sm font-medium truncate" title={c.className}>{c.className}</div>
                            <div className="text-xs font-semibold">{(c.probability * 100).toFixed(2)}%</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const displayColorAnalysis = (colorAnalysis) => {
        const data = {
            labels: colorAnalysis.dominantColors.map(c => c.color),
            datasets: [
                {
                    data: colorAnalysis.dominantColors.map(c => parseFloat(c.percentage)),
                    backgroundColor: colorAnalysis.dominantColors.map(c => c.color),
                },
            ],
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                title: { display: true, text: 'Dominant Colors' },
            },
        };

        return (
            <div style={{ height: '300px', maxWidth: '500px', margin: '0 auto' }}>
                <Pie data={data} options={options} />
            </div>
        );
    };

    return (
        <div className="space-y-10">
            {results.map((item, index) => (
                <div key={item._id || index} className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold mb-5 text-indigo-600">Result for Image {index + 1}</h3>

                    <div className="mb-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <ReactCompareSlider
                            itemOne={
                                <ReactCompareSliderImage
                                    src={item.originalImageUrl}
                                    alt="Original"
                                    onError={(e) => {
                                        console.error('Error loading original image:', e);
                                        e.target.style.display = 'none';
                                    }}
                                />
                            }
                            itemTwo={
                                <ReactCompareSliderImage
                                    src={item.enhancedImageUrl}
                                    alt="Enhanced"
                                    onError={(e) => {
                                        console.error('Error loading enhanced image:', e);
                                        e.target.style.display = 'none';
                                    }}
                                />
                            }
                        />
                    </div>

                    <div className="flex justify-center space-x-4 mb-6">
                        <DownloadButton
                            fileName={item.originalFilename}
                            axiosInstance={axiosInstance}
                            label="Download Original Image"
                        />
                        <DownloadButton
                            fileName={`enhanced_${item.originalFilename}`}
                            axiosInstance={axiosInstance}
                            label="Download Enhanced Image"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                        <div>
                            <h4 className="font-semibold mb-3 text-indigo-600 text-lg">Original Classification</h4>
                            {displayClassification(item.analysis.originalClassification, 'Original Image Classification')}
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3 text-indigo-600 text-lg">Enhanced Classification</h4>
                            {displayClassification(item.analysis.enhancedClassification, 'Enhanced Image Classification')}
                        </div>
                    </div>

                    <div className="mt-6">
                        <h4 className="font-semibold mb-3 text-indigo-600 text-lg">Color Analysis</h4>
                        {displayColorAnalysis(item.analysis.colorAnalysis)}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ImageResults;
