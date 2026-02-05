import React, { useState, useEffect } from 'react';
import { Project } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import logActivity from '../../../utils/activityLogger';
import { projectsService } from '../../../src/services/supabaseService';
import ConfirmModal from '../../shared/ConfirmModal';
import { CloseIcon, BriefcaseIcon } from '../../shared/Icons';
import EmptyState from '../../shared/EmptyState';

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
        // ✅ فحص الصلاحيات قبل فتح المودال
        if (!canEdit) {
            console.warn('🚫 handleOpenModal blocked: No edit permission');
            return;
        }
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
                logActivity('Update Project', `Updated project: ${projectData.name}`, 'projects');
                addToast('تم تحديث المشروع بنجاح', 'success');
            } else {
                await projectsService.create(projectData);
                logActivity('Add Project', `Added project: ${projectData.name}`, 'projects');
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
                logActivity('Delete Project', `Deleted project: ${projectToDelete.name}`, 'projects');
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
                            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200"
                        >
                            <div className="project-card-header p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <BriefcaseIcon className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">{project.name}</h3>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4">
                                <p className="text-sm text-slate-200 mb-4 line-clamp-2">
                                    {project.description || 'لا يوجد وصف'}
                                </p>
                                
                                {(canEdit || canDelete) && (
                                    <div className="flex gap-2 pt-4 border-t border-white/20">
                                        {canEdit && (
                                            <button 
                                                onClick={() => handleOpenModal(project)} 
                                                className="flex-1 text-amber-400 hover:bg-amber-500/20 px-4 py-2 rounded-lg font-semibold transition-colors"
                                            >
                                                تعديل
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button 
                                                onClick={() => handleDelete(project)} 
                                                className="flex-1 text-rose-400 hover:bg-rose-500/20 px-4 py-2 rounded-lg font-semibold transition-colors"
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

            {/* ✅ حماية المودال بفحص الصلاحيات */}
            {isModalOpen && canEdit && (
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

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 w-full max-w-2xl animate-scale-up overflow-hidden" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(100vh-6rem)]">
                    {/* Header */}
                    <div className="px-8 py-5 border-b border-white/20 flex justify-between items-center bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm">
                        <h2 className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                            {project ? 'تعديل مشروع' : 'إضافة مشروع جديد'}
                        </h2>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-rose-500/30 hover:text-rose-100 transition-all duration-300 border border-white/20 hover:scale-110 active:scale-95"
                        >
                            <CloseIcon className="h-5 w-5"/>
                        </button>
                    </div>
                    
                    {/* Body */}
                    <div className="px-8 py-6 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-white/5">
                        <div>
                            <label className="input-label">
                                اسم المشروع <span className="text-rose-400">*</span>
                            </label>
                            <input 
                                type="text" 
                                name="name" 
                                placeholder="مثال: مشروع الياسمين" 
                                value={formData.name} 
                                onChange={handleChange} 
                                className="input-field" 
                                required 
                            />
                        </div>
                        
                        <div>
                            <label className="input-label">
                                الوصف
                            </label>
                            <textarea 
                                name="description" 
                                placeholder="وصف المشروع..." 
                                value={formData.description} 
                                onChange={handleChange} 
                                className="input-field"
                                rows={4}
                            />
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-white/20 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm flex justify-end gap-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="btn-secondary"
                        >
                            إلغاء
                        </button>
                        <button 
                            type="submit" 
                            className="btn-primary"
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
