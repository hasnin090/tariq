import React, { useState, useEffect } from 'react';
import { Project, User } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import logActivity from '../../../utils/activityLogger';
import { CloseIcon, BriefcaseIcon } from '../../shared/Icons';

const Projects: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    useEffect(() => {
        setProjects(JSON.parse(localStorage.getItem('projects') || '[]'));
        setUsers(JSON.parse(localStorage.getItem('users') || '[]').filter((u: User) => u.role === 'Accounting'));
    }, []);

    const saveData = (data: Project[]) => {
        localStorage.setItem('projects', JSON.stringify(data));
        setProjects(data);
    };

    const handleSave = (projectData: Omit<Project, 'id'>) => {
        if (editingProject) {
            const updated = projects.map(p => p.id === editingProject.id ? { ...editingProject, ...projectData } : p);
            saveData(updated);
        } else {
            const newProject: Project = { id: `proj_${Date.now()}`, ...projectData };
            saveData([...projects, newProject]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة المشاريع</h2>
                <button onClick={() => { setEditingProject(null); setIsModalOpen(true); }} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700">إضافة مشروع</button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right">
                    <thead><tr className="border-b-2 bg-slate-100 dark:bg-slate-700"><th className="p-4 font-bold text-sm">اسم المشروع</th><th className="p-4 font-bold text-sm">الوصف</th><th className="p-4 font-bold text-sm">المحاسب المسؤول</th><th className="p-4 font-bold text-sm">إجراءات</th></tr></thead>
                    <tbody>
                        {projects.map(project => (
                            <tr key={project.id} className="border-b dark:border-slate-700">
                                <td className="p-4 font-medium">{project.name}</td>
                                <td className="p-4 max-w-sm truncate">{project.description}</td>
                                <td className="p-4">{users.find(u => u.id === project.assignedUserId)?.name || '-'}</td>
                                <td className="p-4"><button onClick={() => { setEditingProject(project); setIsModalOpen(true); }} className="text-primary-600 hover:underline font-semibold">تعديل</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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
         <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b flex justify-between items-start"><h2 className="text-xl font-bold">{project ? 'تعديل مشروع' : 'إضافة مشروع'}</h2><button type="button" onClick={onClose}><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4">
                        <input type="text" name="name" placeholder="اسم المشروع" value={formData.name} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-slate-700" required />
                        <textarea name="description" placeholder="وصف المشروع" value={formData.description} onChange={handleChange} className="w-full p-2.5 border rounded-lg dark:bg-slate-700" rows={4}></textarea>
                        <select name="assignedUserId" value={formData.assignedUserId} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-700">
                            <option value="">تعيين محاسب (اختياري)</option>
                            {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </select>
                    </div>
                    <div className="px-6 py-4 border-t flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg font-semibold">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};

export default Projects;
