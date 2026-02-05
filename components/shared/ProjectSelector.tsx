import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../../types';
import { BriefcaseIcon } from './Icons';

interface ProjectSelectorProps {
    projects: Project[];
    activeProject: Project | null;
    onSelectProject: (project: Project) => void;
    disabled?: boolean; // ✅ للمستخدمين غير Admin - لا يمكنهم تغيير المشروع
    showAllProjectsOption?: boolean; // ✅ إظهار خيار "جميع المشاريع" (للـ Admin فقط)
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ 
    projects, 
    activeProject, 
    onSelectProject,
    disabled = false,
    showAllProjectsOption = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (projects.length === 0) {
        return null;
    }
    
    // ✅ إذا كان المستخدم غير Admin ولديه مشروع واحد فقط - نعرض فقط اسم المشروع بدون dropdown
    if (disabled && projects.length === 1 && activeProject) {
        return (
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <BriefcaseIcon className="h-4 w-4 text-accent" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">المشروع</h3>
                </div>
                <div className="w-full flex items-center gap-2 p-3 rounded-xl project-selector-active">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/20 backdrop-blur-sm">
                        <BriefcaseIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-right min-w-0">
                        <p className="font-semibold text-sm mb-0.5 truncate text-white">{activeProject.name}</p>
                        <p className="text-[10px] truncate text-white/90">
                            {activeProject.description || 'المشروع المخصص لك'}
                        </p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-white text-[10px] font-semibold bg-white/20">
                        مخصص
                    </span>
                </div>
            </div>
        );
    }

    const handleSelectProject = (project: Project | null) => {
        onSelectProject(project);
        setIsOpen(false);
    };

    return (
        <div className="mb-4" ref={dropdownRef}>
            <div className="flex items-center gap-2 mb-2">
                <BriefcaseIcon className="h-4 w-4 text-accent" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">المشروع النشط</h3>
            </div>
            
            {/* Dropdown Selector */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between gap-2 p-3 rounded-xl transition-all duration-300 border backdrop-blur-xl ${
                        isOpen
                            ? 'backdrop-blur-xl bg-white/10 border-white/30 shadow-md text-white'
                            : activeProject
                            ? 'project-selector-active hover:shadow-lg'
                            : 'project-selector-hover hover:shadow-lg'
                    }`}
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isOpen
                                ? 'bg-white/20 backdrop-blur-sm'
                                : 'bg-white/20 backdrop-blur-sm'
                        }`}>
                            {activeProject ? (
                                <BriefcaseIcon className={`h-5 w-5 ${isOpen ? 'text-accent' : 'text-white'}`} />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isOpen ? 'project-icon-text-inactive' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            )}
                        </div>
                        
                        <div className="flex-1 text-right min-w-0">
                            <p className={`font-semibold text-sm mb-0.5 truncate ${
                                isOpen
                                    ? 'text-slate-100'
                                    : 'text-white'
                            }`}>
                                {activeProject ? activeProject.name : 'جميع المشاريع'}
                            </p>
                            <p className={`text-[10px] truncate ${
                                isOpen
                                    ? 'text-slate-600 dark:text-slate-400'
                                    : 'text-white/90'
                            }`}>
                                {activeProject 
                                    ? (activeProject.description || 'انقر للتبديل بين المشاريع')
                                    : 'عرض جميع البيانات عبر كل المشاريع'
                                }
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        {!isOpen && activeProject && (
                            <span className="px-1.5 py-0.5 rounded text-white text-[10px] font-semibold bg-white/20">
                                نشط
                            </span>
                        )}
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-4 w-4 transition-transform duration-300 ${
                                isOpen 
                                    ? 'rotate-180 text-amber-400' 
                                    : 'text-white'
                            }`}
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 backdrop-blur-2xl bg-white/10 rounded-xl shadow-2xl border border-white/20 z-50 overflow-hidden transition-all duration-500 animate-fade-in-scale-up">
                        {/* Projects List */}
                        <div className="max-h-96 overflow-y-auto">
                            {/* All Projects Option */}
                            <button
                                onClick={() => handleSelectProject(null)}
                                className={`w-full flex items-center gap-2 p-2.5 transition-all duration-300 hover:bg-white/10 border-b border-white/10 ${
                                    !activeProject ? 'bg-white/10' : ''
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    !activeProject 
                                        ? 'project-icon-bg-active shadow-sm' 
                                        : 'bg-white/20 backdrop-blur-sm'
                                }`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${!activeProject ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="font-semibold text-xs text-slate-100">جميع المشاريع</p>
                                    <p className="text-[10px] text-slate-400">عرض كل البيانات</p>
                                </div>
                                {!activeProject && (
                                    <div className="flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 project-checkmark" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* Individual Projects */}
                            {projects.length > 0 ? (
                                projects.map((project) => {
                                    const isActive = activeProject?.id === project.id;
                                    return (
                                        <button
                                            key={project.id}
                                            onClick={() => handleSelectProject(project)}
                                            className={`w-full flex items-center gap-2 p-2.5 transition-all duration-300 hover:bg-white/10 border-b border-white/10 last:border-b-0 ${
                                                isActive ? 'bg-white/10' : ''
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                isActive 
                                                    ? 'project-icon-bg-active shadow-sm' 
                                                    : 'bg-white/20 backdrop-blur-sm'
                                            }`}>
                                                <BriefcaseIcon className={`h-4 w-4 ${isActive ? 'text-white' : 'project-icon-text-inactive'}`} />
                                            </div>
                                            <div className="flex-1 text-right min-w-0">
                                                <p className="font-semibold text-xs text-slate-100 truncate">{project.name}</p>
                                                {project.description && (
                                                    <p className="text-[10px] text-slate-400 truncate">{project.description}</p>
                                                )}
                                            </div>
                                            {isActive && (
                                                <div className="flex-shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 project-checkmark" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-6 text-center text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs font-semibold">لا توجد مشاريع</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="p-2 backdrop-blur-md bg-white/5 border-t border-white/20">
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-slate-500 dark:text-slate-400">
                                    عدد المشاريع: <strong className="text-slate-700 dark:text-slate-300">{projects.length}</strong>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectSelector;
