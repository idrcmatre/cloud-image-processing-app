import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminDashboard = ({ axiosInstance, refreshTrigger }) => {
    const [stats, setStats] = useState(null);
    const [userList, setUserList] = useState([]);
    const [avgProcessingTime, setAvgProcessingTime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAdminData = async () => {
            if (!axiosInstance) {
                console.error('axiosInstance is undefined');
                setError('Failed to load admin data. Please try again.');
                setLoading(false);
                return;
            }

            try {
                const [statsResponse, usersResponse, avgTimesResponse] = await Promise.all([
                    axiosInstance.get('/api/admin/stats'),
                    axiosInstance.get('/api/admin/users'),
                    axiosInstance.get('/api/admin/avg-processing-times')
                ]);
                setStats(statsResponse.data);
                setUserList(usersResponse.data);
                // Assuming the API returns an array with at least one item
                if (avgTimesResponse.data.length > 0) {
                    setAvgProcessingTime(avgTimesResponse.data[0].avg_time / 1000); // Convert ms to seconds
                }
                setLoading(false);
            } catch (err) {
                console.error('Error fetching admin data:', err);
                setError('Failed to load admin data. Please try again.');
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [axiosInstance, refreshTrigger]);

    if (loading) {
        return <div>Loading admin dashboard...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg mt-4">
            <h2 className="text-2xl font-bold mb-4 text-indigo-600">Admin Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-100 p-4 rounded-lg">
                    <h3 className="font-semibold">Total Images Processed</h3>
                    <p className="text-2xl">{stats?.totalImagesProcessed || 0}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg">
                    <h3 className="font-semibold">Total Users</h3>
                    <p className="text-2xl">{stats?.totalUsers || 0}</p>
                </div>
                <div className="bg-yellow-100 p-4 rounded-lg">
                    <h3 className="font-semibold">Images Processed Today</h3>
                    <p className="text-2xl">{stats?.imagesProcessedToday || 0}</p>
                </div>
                <div className="bg-purple-100 p-4 rounded-lg">
                    <h3 className="font-semibold">Avg Processing Time</h3>
                    <p className="text-2xl">{avgProcessingTime ? avgProcessingTime.toFixed(2) : 0} s</p>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">User Activity Chart</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={userList}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="username" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="imagesProcessed" fill="#8884d8" name="Images Processed" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div>
                <h3 className="text-xl font-semibold mb-2">User List</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="py-2 px-4 border-b">Username</th>
                                <th className="py-2 px-4 border-b">Email</th>
                                <th className="py-2 px-4 border-b">Role</th>
                                <th className="py-2 px-4 border-b">Images Processed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userList.map((user) => (
                                <tr key={user.username} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-b">{user.username}</td>
                                    <td className="py-2 px-4 border-b">{user.email}</td>
                                    <td className="py-2 px-4 border-b">{user.role}</td>
                                    <td className="py-2 px-4 border-b">{user.imagesProcessed}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;