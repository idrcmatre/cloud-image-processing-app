import React, { useEffect } from 'react';

const UserInfo = ({ user }) => {
    useEffect(() => {
        console.log('UserInfo received updated user:', user);
    }, [user]);

    if (!user) {
        return <p className="text-center text-gray-500">Loading user information...</p>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-indigo-600">User Information</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-600">Username</p>
                    <p className="font-semibold">{user.username}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <p className="font-semibold capitalize">{user.role}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Images Processed Today</p>
                    <p className="font-semibold">{user.imagesProcessed} / {user.dailyLimit}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Remaining Uploads</p>
                    <p className="font-semibold">{Math.max(0, user.dailyLimit - user.imagesProcessed)}</p>
                </div>
            </div>
        </div>
    );
};

export default UserInfo;