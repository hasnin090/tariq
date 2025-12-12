import React, { useState, useEffect } from 'react';
import { Project, User } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import logActivity from '../../../utils/activityLogger';
import { CloseIcon, BriefcaseIcon } from '../../shared/Icons';
import { projectsService, usersService } from '../../../src/services/supabaseService';

const Projects: React.FC = () => {
    const { addToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

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
            setUsers(usersData.filter((u: User) => u.role === 'Accounting'));
        } catch (error) {
            console.error('Error loading projects:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (projectData: Omit<Project, 'id'>) => {
        try {
            if (editingProject) {
                await projectsService.update(editingProject.id, projectData);
                addToast('تم تحديث المشروع بنجاح', 'success');
                logActivity('Update Project', `Updated project: ${projectData.name}`);
            } else {
                await projectsService.create(projectData);
                addToast('تم إضافة المشروع بنجاح', 'success');
                logActivity('Create Project', `Created new project: ${projectData.name}`);
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving project:', error);
            addToast('خطأ في حفظ المشروع', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة المشاريع (للحسابات)</h2>
                <button onClick={() => { setEditingProject(null); setIsModalOpen(true); }} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700">إضافة مشروع</button>
            </div>
            
            {projects.length === 0 ? (
                <div className="text-center py-16 backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-2xl border-2 border-dashed border-white/20 dark:border-white/10">
                    <BriefcaseIcon className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">لا توجد مشاريع</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">ابدأ بإضافة مشروع جديد</p>
                    <button onClick={() => { setEditingProject(null); setIsModalOpen(true); }} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700">إضافة مشروع</button>
                </div>
            ) : (
                <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-xl shadow-lg border border-white/20 dark:border-white/10 overflow-hidden">
                    <table className="w-full text-right">
                        <thead><tr className="border-b-2 bg-slate-100/50 dark:bg-slate-700/50"><th className="p-4 font-bold text-sm text-slate-900 dark:text-slate-100">اسم المشروع</th><th className="p-4 font-bold text-sm text-slate-900 dark:text-slate-100">الوصف</th><th className="p-4 font-bold text-sm text-slate-900 dark:text-slate-100">المحاسب المسؤول</th><th className="p-4 font-bold text-sm text-slate-900 dark:text-slate-100">إجراءات</th></tr></thead>
                        <tbody>
                            {projects.map(project => (
                                <tr key={project.id} className="border-b border-white/10 dark:border-slate-700 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{project.name}</td>
                                    <td className="p-4 max-w-sm truncate text-slate-700 dark:text-slate-300">{project.description || '-'}</td>
                                    <td className="p-4 text-slate-700 dark:text-slate-300">{users.find(u => u.id === project.assignedUserId)?.name || '-'}</td>
                                    <td className="p-4"><button onClick={() => { setEditingProject(project); setIsModalOpen(true); }} className="text-primary-600 dark:text-primary-400 hover:underline font-semibold">تعديل</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {isModalOpen && <ProjectPanel project={editingProject} users={users} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

interface PanelProps { project: Project | null; users: User[]; onClose: () => void; onSave: (data: Omit<Project, 'id'>) => void; }

const ProjectPanel: React.FC<PanelProps> = ({ project, users, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: project?.name || '',
        description: project?.description || '',
        assignedUserId: project?.assignedUserId || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.name) { addToast('اسم المشروع مطلوب.', 'error'); return; }
        onSave(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
         <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 pt-20" onClick={onClose}>
            <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b border-white/20 dark:border-white/10 flex justify-between items-start"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{project ? 'تعديل مشروع' : 'إضافة مشروع'}</h2><button type="button" onClick={onClose} className="text-slate-300 hover:bg-white/10 p-1 rounded-full"><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4">
                        <input type="text" name="name" placeholder="اسم المشروع" value={formData.name} onChange={handleChange} className="w-full p-3 rounded-lg backdrop-blur-sm bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-primary-500" required />
                        <textarea name="description" placeholder="وصف المشروع" value={formData.description} onChange={handleChange} className="w-full p-3 rounded-lg backdrop-blur-sm bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-primary-500 resize-none" rows={4}></textarea>
                        <select name="assignedUserId" value={formData.assignedUserId} onChange={handleChange} className="w-full p-3 rounded-lg backdrop-blur-sm bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                            <option value="" className="bg-slate-800">تعيين محاسب (اختياري)</option>
                            {users.map(user => <option key={user.id} value={user.id} className="bg-slate-800">{user.name}</option>)}
                        </select>
                    </div>
                    <div className="px-6 py-4 border-t border-white/20 dark:border-white/10 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-white/30 dark:border-white/20 hover:bg-white/10 font-semibold text-slate-900 dark:text-white">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-primary-700 shadow-lg">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};

export default Projects;
