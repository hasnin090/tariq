import React, { useState, useEffect } from 'react';
import { User, Project, ProjectAssignment } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import logActivity from '../../utils/activityLogger';
import { usersService, projectsService } from '../../src/services/supabaseService';
import Modal from '../shared/Modal';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';

const ProjectUserManagement: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedInterface, setSelectedInterface] = useState<'projects' | 'expenses'>('projects');
    const [assignmentToRemove, setAssignmentToRemove] = useState<{ projectId: string; userId: string; mode: 'projects' | 'expenses' } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [projectsData, usersData] = await Promise.all([
                projectsService.getAll(),
                usersService.getAll()
            ]);
            setProjects(projectsData);
            setUsers(usersData.filter(u => u.role !== 'Admin'));
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAssignModal = (project: Project) => {
        setSelectedProject(project);
        setIsAssignModalOpen(true);
        setSelectedUser('');
        setSelectedInterface('projects');
    };

    const handleCloseAssignModal = () => {
        setIsAssignModalOpen(false);
        setSelectedProject(null);
        setSelectedUser('');
    };

    const handleAssignUser = async () => {
        if (!selectedProject || !selectedUser) {
            addToast('يرجى اختيار المستخدم', 'error');
            return;
        }

        try {
            const user = users.find(u => u.id === selectedUser);
            if (!user) return;

            // Check if user already assigned to this project with same interface
            const existingAssignments = selectedProject.assignedUsers || [];
            const alreadyAssigned = existingAssignments.some(
                a => a.projectId === selectedProject.id && selectedInterface === a.interfaceMode
            );

            if (alreadyAssigned) {
                addToast('هذا المشروع له مستخدم مخصص بالفعل لهذه الواجهة', 'error');
                return;
            }

            // Update project with new assignment
            const newAssignment: ProjectAssignment = {
                projectId: selectedProject.id,
                projectName: selectedProject.name,
                interfaceMode: selectedInterface,
                assignedAt: new Date().toISOString()
            };

            const updatedAssignments = [...existingAssignments, newAssignment];
            
            // Update based on interface type
            if (selectedInterface === 'projects') {
                await projectsService.update(selectedProject.id, { 
                    salesUserId: selectedUser,
                    assignedUsers: updatedAssignments 
                });
            } else {
                await projectsService.update(selectedProject.id, { 
                    accountingUserId: selectedUser,
                    assignedUsers: updatedAssignments 
                });
            }

            // Update user's assignments
            const userAssignments = user.projectAssignments || [];
            const updatedUserAssignments = [...userAssignments, newAssignment];
            await usersService.update(selectedUser, { 
                projectAssignments: updatedUserAssignments 
            });

            logActivity('Assign User to Project', `Assigned ${user.name} to ${selectedProject.name} (${selectedInterface})`);
            addToast('تم تعيين المستخدم للمشروع بنجاح', 'success');
            
            handleCloseAssignModal();
            await loadData();
        } catch (error) {
            console.error('Error assigning user:', error);
            addToast('خطأ في تعيين المستخدم', 'error');
        }
    };

    const handleRemoveAssignment = async () => {
        if (!assignmentToRemove) return;

        try {
            const project = projects.find(p => p.id === assignmentToRemove.projectId);
            if (!project) return;

            // Remove from project
            const updatedAssignments = (project.assignedUsers || []).filter(
                a => !(a.projectId === assignmentToRemove.projectId && a.interfaceMode === assignmentToRemove.mode)
            );

            const updateData: any = { assignedUsers: updatedAssignments };
            if (assignmentToRemove.mode === 'projects') {
                updateData.salesUserId = undefined;
            } else {
                updateData.accountingUserId = undefined;
            }

            await projectsService.update(assignmentToRemove.projectId, updateData);

            // Remove from user
            const user = users.find(u => u.id === assignmentToRemove.userId);
            if (user) {
                const updatedUserAssignments = (user.projectAssignments || []).filter(
                    a => !(a.projectId === assignmentToRemove.projectId && a.interfaceMode === assignmentToRemove.mode)
                );
                await usersService.update(assignmentToRemove.userId, { 
                    projectAssignments: updatedUserAssignments 
                });
            }

            logActivity('Remove User Assignment', `Removed user from project ${project.name}`);
            addToast('تم إزالة التعيين بنجاح', 'success');
            
            setAssignmentToRemove(null);
            await loadData();
        } catch (error) {
            console.error('Error removing assignment:', error);
            addToast('خطأ في إزالة التعيين', 'error');
        }
    };

    const getSalesUser = (project: Project) => {
        const userId = project.salesUserId;
        return users.find(u => u.id === userId);
    };

    const getAccountingUser = (project: Project) => {
        const userId = project.accountingUserId;
        return users.find(u => u.id === userId);
    };

    if (currentUser?.role !== 'Admin') {
        return (
            <div className="container mx-auto">
                <div className="bg-rose-100 dark:bg-rose-900/20 border border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-lg">
                    هذه الصفحة متاحة للمدراء فقط
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">إدارة المستخدمين والمشاريع</h2>
                <p className="text-slate-600 dark:text-slate-400">قم بتعيين المستخدمين للمشاريع وتحديد الواجهة (مبيعات أو محاسبة)</p>
            </div>

            {projects.length > 0 ? (
                <div className="grid gap-6">
                    {projects.map(project => {
                        const salesUser = getSalesUser(project);
                        const accountingUser = getAccountingUser(project);

                        return (
                            <div key={project.id} className="glass-card overflow-hidden hover:shadow-xl transition-shadow duration-200">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">{project.name}</h3>
                                            <p className="text-sm text-slate-300">{project.description}</p>
                                        </div>
                                        <button
                                            onClick={() => handleOpenAssignModal(project)}
                                            className="btn-primary text-sm"
                                        >
                                            + تعيين مستخدم
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* Sales Interface */}
                                        <div className="bg-gradient-to-br from-blue-50 to-primary-50 dark:from-blue-900/20 dark:to-primary-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center gap-2 mb-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                                <h4 className="font-bold text-blue-900 dark:text-blue-300">إدارة المبيعات</h4>
                                            </div>
                                            {salesUser ? (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                            {salesUser.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{salesUser.name}</p>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400">{salesUser.role}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setAssignmentToRemove({ projectId: project.id, userId: salesUser.id, mode: 'projects' })}
                                                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                        title="إزالة التعيين"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">لم يتم التعيين</p>
                                            )}
                                        </div>

                                        {/* Accounting Interface */}
                                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                            <div className="flex items-center gap-2 mb-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                <h4 className="font-bold text-purple-900 dark:text-purple-300">الإدارة المحاسبية</h4>
                                            </div>
                                            {accountingUser ? (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                            {accountingUser.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{accountingUser.name}</p>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400">{accountingUser.role}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setAssignmentToRemove({ projectId: project.id, userId: accountingUser.id, mode: 'expenses' })}
                                                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                        title="إزالة التعيين"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">لم يتم التعيين</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState 
                    title="لا توجد مشاريع"
                    message="قم بإنشاء مشروع أولاً لتتمكن من تعيين المستخدمين"
                    Icon={() => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                />
            )}

            {/* Assignment Modal */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={handleCloseAssignModal}
                title={`تعيين مستخدم للمشروع: ${selectedProject?.name || ''}`}
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            نوع الواجهة
                        </label>
                        <select
                            value={selectedInterface}
                            onChange={(e) => setSelectedInterface(e.target.value as 'projects' | 'expenses')}
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="projects">إدارة المبيعات</option>
                            <option value="expenses">الإدارة المحاسبية</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            المستخدم
                        </label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">اختر مستخدم</option>
                            {users
                                .filter(u => 
                                    (selectedInterface === 'projects' && u.role === 'Sales') ||
                                    (selectedInterface === 'expenses' && u.role === 'Accounting')
                                )
                                .map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.role})
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleCloseAssignModal}
                            className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleAssignUser}
                            className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm transition-colors"
                        >
                            تعيين
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Remove Modal */}
            <ConfirmModal
                isOpen={!!assignmentToRemove}
                onClose={() => setAssignmentToRemove(null)}
                onConfirm={handleRemoveAssignment}
                title="تأكيد إزالة التعيين"
                message="هل أنت متأكد من إزالة هذا التعيين؟"
            />
        </div>
    );
};

export default ProjectUserManagement;
