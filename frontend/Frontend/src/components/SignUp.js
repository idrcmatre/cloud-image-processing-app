import React, { useState } from 'react';
import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import axios from 'axios';

const SignUp = ({ onSignUpSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('standard');
    const [error, setError] = useState('');

    const getDailyLimit = (role) => {
        switch (role) {
            case 'premium':
                return 50;
            case 'admin':
                return 100;
            default:
                return 10;
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');

        const dailyLimit = getDailyLimit(role);

        const client = new CognitoIdentityProviderClient({ region: process.env.REACT_APP_AWS_REGION });
        const command = new SignUpCommand({
            ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
            Username: username,
            Password: password,
            UserAttributes: [
                { Name: "email", Value: email },
                { Name: "custom:dailyLimit", Value: dailyLimit.toString() },
                { Name: "custom:enhancementLevel", Value: "1" },
                { Name: "custom:imagesProcessed", Value: "0" },
                { Name: "custom:originalEmail", Value: "n11484209@qut.edu.au" },
                { Name: "custom:preferredAnalysis", Value: "both" },
                { Name: "custom:Role", Value: role },
            ],
        });

        try {
            const response = await client.send(command);
            console.log("Sign up successful", response);

            const dynamoDBResponse = await axios.post(`${process.env.REACT_APP_API_URL}/api/users/create`, {
                username,
                email,
                dailyLimit,
                enhancementLevel: 1,
                imagesProcessed: 0,
                originalEmail: "n11484209@qut.edu.au",
                preferredAnalysis: "both",
                role,
                'qut-username': "n11484209@qut.edu.au"
            });

            console.log("DynamoDB response:", dynamoDBResponse.data);

            onSignUpSuccess(username);
        } catch (error) {
            console.error("Error signing up:", error);
            if (error.response) {
                console.error("Error response from server:", error.response.data);
            }
            setError(error.message);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-indigo-600">Sign Up</h2>
            <form onSubmit={handleSignUp} className="space-y-4">
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2 border rounded"
                >
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit" className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600">
                    Sign Up
                </button>
            </form>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
    );
};

export default SignUp;