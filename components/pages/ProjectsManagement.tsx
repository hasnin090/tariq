import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import logActivity from '../../utils/activityLogger';
import { projectsService } from '../../src/services/supabaseService';
import ConfirmModal from '../shared/ConfirmModal';
import { CloseIcon, BriefcaseIcon } from '../shared/Icons';
import EmptyState from '../shared/EmptyState';

const ProjectsManagement: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    const canEdit = currentUser?.role === 'Admin';
    const canDelete = currentUser?.role === 'Admin';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const projectsData = await projectsService.getAll();
            setProjects(projectsData);
        } catch (error) {
            console.error('Error loading projects:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (project: Project | null) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingProject(null);
        setIsModalOpen(false);
    };

    const handleSave = async (projectData: Omit<Project, 'id'>) => {
        try {
            if (editingProject) {
                await projectsService.update(editingProject.id, projectData);
                logActivity('Update Project', `Updated project: ${projectData.name}`);
                addToast('تم تحديث المشروع بنجاح', 'success');
            } else {
                await projectsService.create(projectData);
                logActivity('Add Project', `Added project: ${projectData.name}`);
                addToast('تم إضافة المشروع بنجاح', 'success');
            }

            handleCloseModal();
            await loadData();
        } catch (error) {
            console.error('Error saving project:', error);
            addToast('خطأ في حفظ المشروع', 'error');
        }
    };

    const handleDelete = async (project: Project) => {
        setProjectToDelete(project);
    };

    const confirmDelete = async () => {
        if (projectToDelete) {
            try {
                await projectsService.delete(projectToDelete.id);
                logActivity('Delete Project', `Deleted project: ${projectToDelete.name}`);
                addToast('تم حذف المشروع بنجاح', 'success');
                setProjectToDelete(null);
                await loadData();
            } catch (error) {
                console.error('Error deleting project:', error);
                addToast('خطأ في حذف المشروع', 'error');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة المشاريع</h2>
                {canEdit && (
                    <button 
                        onClick={() => handleOpenModal(null)} 
                        className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm"
                    >
                        إضافة مشروع
                    </button>
                )}
            </div>

            {projects.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map(project => (
                        <div 
                            key={project.id} 
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all duration-200"
                        >
                            <div className="bg-gradient-to-r from-primary-500 to-blue-600 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <BriefcaseIcon className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">{project.name}</h3>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                    {project.description || 'لا يوجد وصف'}
                                </p>
                                
                                {(canEdit || canDelete) && (
                                    <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        {canEdit && (
                                            <button 
                                                onClick={() => handleOpenModal(project)} 
                                                className="flex-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-4 py-2 rounded-lg font-semibold transition-colors"
                                            >
                                                تعديل
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button 
                                                onClick={() => handleDelete(project)} 
                                                className="flex-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-4 py-2 rounded-lg font-semibold transition-colors"
                                            >
                                                حذف
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState 
                    Icon={BriefcaseIcon} 
                    title="لا توجد مشاريع" 
                    message="ابدأ بإضافة مشروع جديد لتتمكن من إدارة المبيعات والحسابات."
                    actionButton={canEdit ? { text: 'إضافة مشروع', onClick: () => handleOpenModal(null) } : undefined}
                />
            )}

            {isModalOpen && (
                <ProjectPanel 
                    project={editingProject} 
                    onClose={handleCloseModal} 
                    onSave={handleSave} 
                />
            )}

            <ConfirmModal 
                isOpen={!!projectToDelete} 
                onClose={() => setProjectToDelete(null)} 
                onConfirm={confirmDelete} 
                title="تأكيد الحذف" 
                message={`هل أنت متأكد من حذف المشروع "${projectToDelete?.name}"؟`} 
            />
        </div>
    );
};

interface PanelProps {
    project: Project | null;
    onClose: () => void;
    onSave: (data: Omit<Project, 'id'>) => void;
}

const ProjectPanel: React.FC<PanelProps> = ({ project, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: project?.name || '',
        description: project?.description || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            addToast('اسم المشروع حقل إلزامي.', 'error');
            return;
        }
        onSave(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {project ? 'تعديل مشروع' : 'إضافة مشروع جديد'}
                        </h2>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <CloseIcon className="h-6 w-6"/>
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                اسم المشروع *
                            </label>
                            <input 
                                type="text" 
                                name="name" 
                                placeholder="مثال: مشروع الياسمين" 
                                value={formData.name} 
                                onChange={handleChange} 
                                className={inputStyle} 
                                required 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                الوصف
                            </label>
                            <textarea 
                                name="description" 
                                placeholder="وصف المشروع..." 
                                value={formData.description} 
                                onChange={handleChange} 
                                className={`${inputStyle} min-h-[120px] resize-none`}
                                rows={4}
                            />
                        </div>
                    </div>
                    
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold transition-colors"
                        >
                            إلغاء
                        </button>
                        <button 
                            type="submit" 
                            className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm transition-colors"
                        >
                            حفظ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectsManagement;
