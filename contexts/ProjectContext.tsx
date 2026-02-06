import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Project } from '../types';
import { projectsService } from '../src/services/supabaseService';
import { useAuth } from './AuthContext';

interface ProjectContextType {
    activeProject: Project | null;
    setActiveProject: (project: Project | null) => void;
    availableProjects: Project[];
    loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [activeProject, setActiveProjectState] = useState<Project | null>(null);
    const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProjects = useCallback(async () => {
        if (!currentUser) {
            setAvailableProjects([]);
            setActiveProjectState(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const allProjects = await projectsService.getAll();
            
            let userProjects: Project[] = [];
            
            if (currentUser.role === 'Admin') {
                // Admin sees all projects
                userProjects = allProjects;
            } else {
                // ✅ فلترة صارمة: المستخدمون غير Admin يرون فقط المشروع المخصص لهم
                // نستخدم assignedProjectId من AuthContext أولاً، ثم نتحقق من assigned_user_id في المشروع
                const assignedProjectId = currentUser.assignedProjectId;
                
                if (assignedProjectId) {
                    // المستخدم لديه مشروع مخصص - نعرض هذا المشروع فقط
                    userProjects = allProjects.filter(p => p.id === assignedProjectId);
                } else {
                    // البحث في المشاريع عن المشروع المخصص لهذا المستخدم
                    userProjects = allProjects.filter(p => 
                        p.assignedUserId === currentUser.id ||
                        p.salesUserId === currentUser.id ||
                        p.accountingUserId === currentUser.id
                    );
                }
                
            }
            
            setAvailableProjects(userProjects);
            
            // ✅ للمستخدمين غير Admin: دائماً استخدام المشروع المخصص (لا يمكن التغيير)
            if (currentUser.role !== 'Admin') {
                if (userProjects.length > 0) {
                    setActiveProjectState(userProjects[0]);
                    sessionStorage.setItem('activeProjectId', userProjects[0].id);
                } else {
                    setActiveProjectState(null);
                    console.warn('⚠️ No project assigned to user:', currentUser.name);
                }
            } else {
                // Admin: يمكنه اختيار المشروع أو رؤية الكل
                const savedProjectId = sessionStorage.getItem('activeProjectId');
                if (savedProjectId) {
                    const savedProject = userProjects.find(p => p.id === savedProjectId);
                    if (savedProject) {
                        setActiveProjectState(savedProject);
                    } else {
                        setActiveProjectState(null);
                    }
                } else {
                    // Admin defaults to null (all projects)
                    setActiveProjectState(null);
                }
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        let isCancelled = false;
        
        const load = async () => {
            await loadProjects();
        };
        
        load();
        
        return () => {
            isCancelled = true;
        };
    }, [loadProjects]);

    const setActiveProject = useCallback((project: Project | null) => {
        setActiveProjectState(project);
        if (project) {
            sessionStorage.setItem('activeProjectId', project.id);
        } else {
            sessionStorage.removeItem('activeProjectId');
        }
    }, []);

    // ✅ useMemo لمنع re-renders غير ضرورية
    const value = useMemo(() => ({
        activeProject,
        setActiveProject,
        availableProjects,
        loading
    }), [activeProject, setActiveProject, availableProjects, loading]);

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within ProjectProvider');
    }
    return context;
};
