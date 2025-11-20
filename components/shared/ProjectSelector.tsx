import React from 'react';
import { Project } from '../../types';
import { BriefcaseIcon } from './Icons';

interface ProjectSelectorProps {
    projects: Project[];
    activeProject: Project | null;
    onSelectProject: (project: Project) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects, activeProject, onSelectProject }) => {
    if (projects.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <BriefcaseIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">اختر المشروع</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {/* زر جميع المشاريع */}
                <button
                    onClick={() => onSelectProject(null)}
                    className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                        !activeProject
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30'
                            : 'bg-white dark:bg-slate-800 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                >
                    {/* Animated Background */}
                    {!activeProject && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    )}
                    
                    {/* Content */}
                    <div className="relative z-10 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            !activeProject 
                                ? 'bg-white/25 shadow-lg' 
                                : 'bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50'
                        }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-colors duration-300 ${
                                !activeProject 
                                    ? 'text-white' 
                                    : 'text-emerald-600 dark:text-emerald-400'
                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </div>
                        
                        <div className="flex-1 text-right min-w-0">
                            <p className={`font-bold text-sm transition-colors duration-300 ${
                                !activeProject 
                                    ? 'text-white' 
                                    : 'text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300'
                            }`}>
                                جميع المشاريع
                            </p>
                            <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                                !activeProject 
                                    ? 'text-white/80' 
                                    : 'text-slate-500 dark:text-slate-400 group-hover:text-emerald-600/80 dark:group-hover:text-emerald-400/80'
                            }`}>
                                عرض كل البيانات
                            </p>
                        </div>
                    </div>
                    
                    {/* Active Indicator */}
                    {!activeProject && (
                        <div className="absolute top-2 left-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                    )}
                </button>

                {projects.map(project => {
                    const isActive = activeProject?.id === project.id;
                    
                    return (
                        <button
                            key={project.id}
                            onClick={() => onSelectProject(project)}
                            className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                isActive
                                    ? 'bg-gradient-to-br from-primary-500 to-blue-600 shadow-xl shadow-primary-500/30'
                                    : 'bg-white dark:bg-slate-800 hover:bg-gradient-to-br hover:from-primary-50 hover:to-blue-50 dark:hover:from-primary-900/20 dark:hover:to-blue-900/20 border-2 border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                            }`}
                        >
                            {/* Animated Background */}
                            {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                            )}
                            
                            {/* Content */}
                            <div className="relative z-10 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                                    isActive 
                                        ? 'bg-white/25 shadow-lg' 
                                        : 'bg-primary-100 dark:bg-primary-900/30 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50'
                                }`}>
                                    <BriefcaseIcon className={`h-5 w-5 transition-colors duration-300 ${
                                        isActive 
                                            ? 'text-white' 
                                            : 'text-primary-600 dark:text-primary-400'
                                    }`} />
                                </div>
                                
                                <div className="flex-1 text-right min-w-0">
                                    <p className={`font-bold text-sm truncate transition-colors duration-300 ${
                                        isActive 
                                            ? 'text-white' 
                                            : 'text-slate-800 dark:text-slate-100 group-hover:text-primary-700 dark:group-hover:text-primary-300'
                                    }`}>
                                        {project.name}
                                    </p>
                                    {project.description && (
                                        <p className={`text-xs truncate mt-0.5 transition-colors duration-300 ${
                                            isActive 
                                                ? 'text-white/80' 
                                                : 'text-slate-500 dark:text-slate-400 group-hover:text-primary-600/80 dark:group-hover:text-primary-400/80'
                                        }`}>
                                            {project.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute top-2 left-2">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                </div>
                            )}
                            
                            {/* Hover Effect */}
                            {!isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-100/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            )}
                        </button>
                    );
                })}
            </div>
            
            {/* Info Text */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {activeProject ? (
                    <span>عرض بيانات مشروع: <strong className="text-primary-600 dark:text-primary-400">{activeProject.name}</strong></span>
                ) : (
                    <span>عرض بيانات: <strong className="text-emerald-600 dark:text-emerald-400">جميع المشاريع</strong></span>
                )}
            </div>
        </div>
    );
};

export default ProjectSelector;
