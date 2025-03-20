document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const uploadForm = document.getElementById('uploadForm');
    const result = document.getElementById('result');
    const loginDiv = document.getElementById('login-form');
    const uploadDiv = document.getElementById('upload-form');
    const logoutDiv = document.getElementById('logout-div');
    const logoutButton = document.getElementById('logoutButton');
    const userInfoDiv = document.getElementById('user-info');

    function showAlert(message, isError = false) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg ${isError ? 'bg-red-500' : 'bg-green-500'} text-white`;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }

    function displayClassification(classification, title) {
        return `
            <h4 class="font-semibold mb-2">${title}</h4>
            <ul class="list-none pl-0">
                ${classification.map(c => `
                    <li class="mb-1">
                        <span class="font-semibold">${c.className}:</span>
                        <span class="ml-2">${(c.probability * 100).toFixed(2)}%</span>
                        <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div class="bg-green-500 h-full" style="width: ${c.probability * 100}%"></div>
                        </div>
                    </li>`).join('')}
            </ul>
        `;
    }

    function getColorName(hexColor) {
        const colors = {
            '#FF0000': 'Red', '#00FF00': 'Green', '#0000FF': 'Blue',
            '#FFFF00': 'Yellow', '#FF00FF': 'Magenta', '#00FFFF': 'Cyan',
            '#000000': 'Black', '#FFFFFF': 'White', '#808080': 'Gray'
        };
        return colors[hexColor.toUpperCase()] || 'Custom';
    }

    function displayColorAnalysis(colorAnalysis) {
        if (!colorAnalysis || !colorAnalysis.dominantColors || colorAnalysis.dominantColors.length === 0) {
            return '<p>No color analysis available</p>';
        }

        return `
            <h4 class="font-semibold mb-2">Dominant Colors</h4>
            <div class="flex flex-wrap gap-2">
                ${colorAnalysis.dominantColors.map(color => `
                    <div class="flex items-center bg-gray-100 rounded p-2">
                        <div class="w-8 h-8 rounded mr-2" style="background-color: ${color.color};"></div>
                        <div>
                            <div class="font-semibold">${getColorName(color.color)}</div>
                            <div class="text-xs">${color.color} (${color.percentage}%)</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async function fetchAndDisplayUserInfo() {
        try {
            const response = await fetch('/user/info');
            const userInfo = await response.json();
            userInfoDiv.innerHTML = `
                <h3 class="text-xl font-bold mb-2">User Information</h3>
                <p><strong>Username:</strong> ${userInfo.username}</p>
                <p><strong>Role:</strong> ${userInfo.role}</p>
                <p><strong>Images Processed Today:</strong> ${userInfo.imagesProcessed} / ${userInfo.dailyLimit}</p>
                <p><strong>Remaining Uploads:</strong> ${Math.max(0, userInfo.dailyLimit - userInfo.imagesProcessed)}</p>
            `;
            userInfoDiv.classList.remove('hidden');
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const loginData = Object.fromEntries(formData);

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });
            const data = await response.json();

            if (data.success) {
                loginDiv.classList.add('hidden');
                uploadDiv.classList.remove('hidden');
                logoutDiv.classList.remove('hidden');
                fetchAndDisplayUserInfo();
                showAlert('Logged in successfully');
            } else {
                showAlert(data.message, true);
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('An error occurred during login. Please try again.', true);
        }
    });

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        result.innerHTML = '<p class="text-blue-500">Processing... Please wait.</p>';
        const formData = new FormData(uploadForm);
        try {
            const response = await fetch('/api/process-bulk', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('You have reached your daily image processing limit.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Received data from server:', data);
            if (data.error) {
                result.innerHTML = `<p class="text-red-500">Error: ${data.error}</p>`;
                showAlert(`Error: ${data.error}`, true);
            } else {
                result.innerHTML = ''; // Clear previous results
                data.forEach((item, index) => {
                    const resultDiv = document.createElement('div');
                    resultDiv.className = 'bg-gray-50 p-4 rounded-lg shadow mb-4';
                    resultDiv.innerHTML = `
                        <h3 class="font-bold mb-2">Result for Image ${index + 1}</h3>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <h4 class="font-semibold mb-2">Original Image</h4>
                                <img src="${item.originalImageUrl}" alt="Original image" class="w-full h-48 object-contain bg-gray-200">
                            </div>
                            <div>
                                <h4 class="font-semibold mb-2">Enhanced Image</h4>
                                <img src="${item.enhancedImageUrl}" alt="Enhanced image" class="w-full h-48 object-contain bg-gray-200">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            ${displayClassification(item.analysis.originalClassification, 'Original Image Classification')}
                            ${displayClassification(item.analysis.enhancedClassification, 'Enhanced Image Classification')}
                        </div>
                        <div class="mb-4">
                            ${displayColorAnalysis(item.analysis.colorAnalysis)}
                        </div>
                        <div>
                            <h4 class="font-semibold mb-2">Image Metadata</h4>
                            <pre class="text-xs overflow-auto max-h-48 bg-gray-100 p-2 rounded">${JSON.stringify(item.analysis, null, 2)}</pre>
                        </div>
                    `;
                    result.appendChild(resultDiv);
                });
                showAlert('Images processed successfully');
                fetchAndDisplayUserInfo(); // Update user info after processing
            }
        } catch (error) {
            console.error('Upload error:', error);
            result.innerHTML = `<p class="text-red-500">An error occurred during image processing: ${error.message}</p>`;
            showAlert(`An error occurred during image processing: ${error.message}`, true);
        }
    });

    logoutButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/auth/logout', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                loginDiv.classList.remove('hidden');
                uploadDiv.classList.add('hidden');
                logoutDiv.classList.add('hidden');
                userInfoDiv.classList.add('hidden');
                result.innerHTML = '';
                showAlert('Logged out successfully');
            } else {
                showAlert('Logout failed', true);
            }
        } catch (error) {
            console.error('Logout error:', error);
            showAlert('An error occurred during logout. Please try again.', true);
        }
    });
});