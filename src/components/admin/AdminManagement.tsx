import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, UserPlus, Mail, Calendar, Loader } from 'lucide-react';
import { ref, get } from 'firebase/database';
import { database } from '../../lib/firebase';

interface AdminUser {
    uid: string;
    email: string;
    name: string;
    role: string;
    registrationNumber?: string;
}

const AdminManagement: React.FC = () => {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            setError('');

            // Fetch all users
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);

            if (snapshot.exists()) {
                const usersData = snapshot.val();
                const adminList: AdminUser[] = [];

                // Filter for admin users
                Object.entries(usersData).forEach(([uid, userData]: [string, any]) => {
                    if (userData.role === 'admin') {
                        adminList.push({
                            uid,
                            email: userData.email,
                            name: userData.name,
                            role: userData.role,
                            registrationNumber: userData.registrationNumber,
                        });
                    }
                });

                // Sort by name
                adminList.sort((a, b) => a.name.localeCompare(b.name));
                setAdmins(adminList);
            } else {
                setAdmins([]);
            }
        } catch (error: any) {
            console.error('Error fetching admins:', error);
            setError('Failed to load admin list. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Shield className="h-8 w-8 text-purple-500" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Admin Management
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Manage administrator accounts
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/admin/create-admin')}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                >
                    <UserPlus className="h-5 w-5" />
                    <span>Add New Admin</span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 text-purple-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Admin Count */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                        <p className="text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-purple-600 dark:text-purple-400">
                                {admins.length}
                            </span>{' '}
                            administrator{admins.length !== 1 ? 's' : ''} registered
                        </p>
                    </div>

                    {/* Admin List */}
                    <div className="grid gap-4">
                        {admins.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                <p className="text-slate-600 dark:text-slate-400">
                                    No administrators found
                                </p>
                            </div>
                        ) : (
                            admins.map((admin) => (
                                <div
                                    key={admin.uid}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {admin.name}
                                                </h3>
                                                <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <Mail className="h-4 w-4" />
                                                    <span>{admin.email}</span>
                                                </div>
                                                {admin.registrationNumber && (
                                                    <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>ID: {admin.registrationNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
                                            Administrator
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminManagement;
