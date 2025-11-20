import React from 'react';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelector from './ProjectSelector';

interface WithProjectFilterProps {
    showSelector?: boolean;
    fullWidth?: boolean;
}

/**
 * Higher Order Component to add project filtering to any page
 * Wraps the page content with ProjectSelector and provides filtered data
 */
export function withProjectFilter<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    options: WithProjectFilterProps = { showSelector: true, fullWidth: false }
) {
    return function WithProjectFilterComponent(props: P) {
        const { activeProject, availableProjects, setActiveProject } = useProject();

        return (
            <div className={options.fullWidth ? 'w-full' : 'container mx-auto'}>
                {options.showSelector && availableProjects.length > 0 && (
                    <ProjectSelector 
                        projects={availableProjects}
                        activeProject={activeProject}
                        onSelectProject={setActiveProject}
                    />
                )}
                <WrappedComponent {...props} />
            </div>
        );
    };
}

/**
 * Hook to filter array data by active project
 * Usage: const filteredUnits = useProjectFilter(units, 'projectId');
 */
export function useProjectFilter<T extends Record<string, any>>(
    data: T[],
    projectIdField: keyof T = 'projectId' as keyof T
): T[] {
    const { activeProject } = useProject();

    if (!activeProject) {
        // No active project selected - show all data
        return data;
    }

    // Filter data by projectId
    return data.filter(item => item[projectIdField] === activeProject.id);
}

/**
 * Hook to filter nested data (e.g., payments filtered by booking's unit's projectId)
 */
export function useNestedProjectFilter<T extends Record<string, any>>(
    data: T[],
    relatedData: any[],
    relationField: string,
    relatedIdField: string,
    projectIdField: string = 'projectId'
): T[] {
    const { activeProject } = useProject();

    if (!activeProject) {
        return data;
    }

    // Create a Set of related IDs that belong to the active project
    const relatedIds = new Set(
        relatedData
            .filter(item => item[projectIdField] === activeProject.id)
            .map(item => item.id)
    );

    // Filter main data where the relation field matches related IDs
    return data.filter(item => relatedIds.has(item[relationField]));
}

export default withProjectFilter;
