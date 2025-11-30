import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../../types';
import { BriefcaseIcon } from './Icons';

interface ProjectSelectorProps {
    projects: Project[];
    activeProject: Project | null;
    onSelectProject: (project: Project) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects, activeProject, onSelectProject }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelectProject = (project: Project | null) => {
        onSelectProject(project);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="mb-6" ref={dropdownRef}>
            <div className="flex items-center gap-2 mb-3">
                <BriefcaseIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">المشروع النشط</h3>
            </div>
            
            {/* Dropdown Selector */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl transition-all duration-300 border-2 ${
                        isOpen
                            ? 'bg-gradient-to-br from-slate-800 to-slate-700 border-amber-400 shadow-lg'
                            : activeProject
                            ? 'bg-gradient-to-br from-amber-600 to-amber-700 border-amber-500 shadow-lg shadow-amber-500/30 hover:shadow-xl'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl'
                    }`}
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isOpen
                                ? 'bg-slate-700/50'
                                : 'bg-white/25 backdrop-blur-sm'
                        }`}>
                            {activeProject ? (
                                <BriefcaseIcon className={`h-6 w-6 ${isOpen ? 'text-amber-400' : 'text-white'}`} />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            )}
                        </div>
                        
                        <div className="flex-1 text-right min-w-0">
                            <p className={`font-bold text-base mb-1 truncate ${
                                isOpen
                                    ? 'text-slate-800 dark:text-slate-100'
                                    : 'text-white'
                            }`}>
                                {activeProject ? activeProject.name : 'جميع المشاريع'}
                            </p>
                            <p className={`text-xs truncate ${
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
                    
                    <div className="flex items-center gap-2">
                        {!isOpen && activeProject && (
                            <span className="px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-xs font-semibold">
                                نشط
                            </span>
                        )}
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-5 w-5 transition-transform duration-300 ${
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
                    <div className="absolute top-full left-0 right-0 mt-2 backdrop-blur-2xl bg-white/95 dark:bg-slate-800/95 rounded-2xl shadow-2xl border-2 border-white/30 dark:border-slate-700/50 z-50 overflow-hidden transition-all duration-500 animate-fade-in-scale-up">
                        {/* Search Bar */}
                        <div className="p-3 border-b border-white/30 dark:border-slate-700/50">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="ابحث عن مشروع..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-600/50 rounded-xl backdrop-blur-lg bg-slate-800/50 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 text-slate-100 placeholder:text-slate-500 text-sm transition-all duration-300"
                                    autoFocus
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* Projects List */}
                        <div className="max-h-96 overflow-y-auto">
                            {/* All Projects Option */}
                            <button
                                onClick={() => handleSelectProject(null)}
                                className={`w-full flex items-center gap-3 p-4 transition-all duration-500 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/30 hover:scale-[1.01] border-b border-white/30 dark:border-slate-700/50 ${
                                    !activeProject ? 'bg-emerald-50/80 dark:bg-emerald-900/40 scale-[1.01]' : ''
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    !activeProject 
                                        ? 'bg-emerald-500 shadow-md' 
                                        : 'bg-emerald-100 dark:bg-emerald-900/30'
                                }`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${!activeProject ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">جميع المشاريع</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">عرض البيانات من كل المشاريع</p>
                                </div>
                                {!activeProject && (
                                    <div className="flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* Individual Projects */}
                            {filteredProjects.length > 0 ? (
                                filteredProjects.map((project) => {
                                    const isActive = activeProject?.id === project.id;
                                    return (
                                        <button
                                            key={project.id}
                                            onClick={() => handleSelectProject(project)}
                                            className={`w-full flex items-center gap-3 p-4 transition-all duration-500 hover:bg-amber-900/30 hover:scale-[1.01] border-b border-white/30 dark:border-slate-700/50 last:border-b-0 ${
                                                isActive ? 'bg-amber-900/40 scale-[1.01]' : ''
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                isActive 
                                                    ? 'bg-amber-500 shadow-md' 
                                                    : 'bg-amber-900/30'
                                            }`}>
                                                <BriefcaseIcon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-amber-400'}`} />
                                            </div>
                                            <div className="flex-1 text-right min-w-0">
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{project.name}</p>
                                                {project.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{project.description}</p>
                                                )}
                                            </div>
                                            {isActive && (
                                                <div className="flex-shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm font-semibold">لا توجد مشاريع مطابقة</p>
                                    <p className="text-xs mt-1">جرب كلمات بحث مختلفة</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="p-3 backdrop-blur-md bg-slate-50/80 dark:bg-slate-900/60 border-t border-white/30 dark:border-slate-700/50">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">
                                    عدد المشاريع: <strong className="text-slate-700 dark:text-slate-300">{projects.length}</strong>
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                    المعروض: <strong className="text-slate-700 dark:text-slate-300">{filteredProjects.length}</strong>
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
