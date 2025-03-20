import React, { useState } from 'react';
import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const ConfirmSignUp = ({ username, onConfirmSuccess }) => {
    const [confirmationCode, setConfirmationCode] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = async (e) => {
        e.preventDefault();
        setError('');

        const client = new CognitoIdentityProviderClient({ region: process.env.REACT_APP_AWS_REGION });
        const command = new ConfirmSignUpCommand({
            ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
            Username: username,
            ConfirmationCode: confirmationCode,
        });

        try {
            const response = await client.send(command);
            console.log("Confirmation successful", response);
            onConfirmSuccess();
        } catch (error) {
            console.error("Error confirming sign up:", error);
            setError(error.message);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-indigo-600">Confirm Sign Up</h2>
            <form onSubmit={handleConfirm} className="space-y-4">
                <input
                    type="text"
                    placeholder="Confirmation Code"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                <button type="submit" className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600">
                    Confirm
                </button>
            </form>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
    );
};

export default ConfirmSignUp;
