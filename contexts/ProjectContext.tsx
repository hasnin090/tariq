import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

    useEffect(() => {
        loadProjects();
    }, [currentUser]);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const allProjects = await projectsService.getAll();
            
            let userProjects: Project[] = [];
            
            if (currentUser?.role === 'Admin') {
                // Admin sees all projects
                userProjects = allProjects;
            } else if (currentUser?.role === 'Sales') {
                // Sales users see only assigned projects
                userProjects = allProjects.filter(p => p.salesUserId === currentUser.id);
            } else if (currentUser?.role === 'Accounting') {
                // Accounting users see only assigned projects
                userProjects = allProjects.filter(p => p.accountingUserId === currentUser.id);
            }
            
            setAvailableProjects(userProjects);
            
            // Set active project from sessionStorage or first available
            const savedProjectId = sessionStorage.getItem('activeProjectId');
            if (savedProjectId) {
                const savedProject = userProjects.find(p => p.id === savedProjectId);
                if (savedProject) {
                    setActiveProjectState(savedProject);
                } else if (userProjects.length > 0) {
                    setActiveProjectState(userProjects[0]);
                }
            } else if (userProjects.length > 0) {
                setActiveProjectState(userProjects[0]);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const setActiveProject = (project: Project | null) => {
        setActiveProjectState(project);
        if (project) {
            sessionStorage.setItem('activeProjectId', project.id);
        } else {
            sessionStorage.removeItem('activeProjectId');
        }
    };

    return (
        <ProjectContext.Provider value={{ activeProject, setActiveProject, availableProjects, loading }}>
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
