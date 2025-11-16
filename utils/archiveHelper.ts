/**
 * Archive utility functions
 * Provides functions to archive and restore items
 */

export interface ArchivedItem {
    id: string;
    type: 'expense' | 'payment' | 'transaction' | 'sale';
    date: string;
    description: string;
    amount: number;
    archivedAt: string;
    archivedBy: string;
    details: any;
}

/**
 * Archive an item to localStorage
 */
export const archiveItem = (
    type: 'expense' | 'payment' | 'transaction' | 'sale',
    item: any,
    userName: string
): void => {
    try {
        const archivedItems = JSON.parse(localStorage.getItem('archivedItems') || '[]');
        
        const archivedItem: ArchivedItem = {
            id: item.id,
            type,
            date: item.date || item.paymentDate || item.saleDate || new Date().toISOString().split('T')[0],
            description: item.description || item.unitName || `${type} - ${item.id}`,
            amount: item.amount || item.finalSalePrice || 0,
            archivedAt: new Date().toISOString().split('T')[0],
            archivedBy: userName,
            details: item
        };
        
        archivedItems.push(archivedItem);
        localStorage.setItem('archivedItems', JSON.stringify(archivedItems));
    } catch (error) {
        console.error('Error archiving item:', error);
        throw error;
    }
};

/**
 * Get all archived items
 */
export const getArchivedItems = (): ArchivedItem[] => {
    try {
        return JSON.parse(localStorage.getItem('archivedItems') || '[]');
    } catch (error) {
        console.error('Error getting archived items:', error);
        return [];
    }
};

/**
 * Get archived items by type
 */
export const getArchivedItemsByType = (type: 'expense' | 'payment' | 'transaction' | 'sale'): ArchivedItem[] => {
    try {
        const items = getArchivedItems();
        return items.filter(item => item.type === type);
    } catch (error) {
        console.error('Error getting archived items by type:', error);
        return [];
    }
};

/**
 * Remove item from archive permanently (Admin only)
 */
export const deleteArchivedItem = (itemId: string): void => {
    try {
        const archivedItems = getArchivedItems();
        const updatedItems = archivedItems.filter(item => item.id !== itemId);
        localStorage.setItem('archivedItems', JSON.stringify(updatedItems));
    } catch (error) {
        console.error('Error deleting archived item:', error);
        throw error;
    }
};

/**
 * Restore item from archive to its original location
 */
export const restoreArchivedItem = (itemId: string): boolean => {
    try {
        const archivedItems = getArchivedItems();
        const itemToRestore = archivedItems.find(item => item.id === itemId);
        
        if (!itemToRestore) return false;
        
        // Get storage key based on type
        const storageKeys: Record<string, string> = {
            expense: 'expenses',
            payment: 'payments',
            transaction: 'transactions',
            sale: 'unitSales'
        };
        
        const storageKey = storageKeys[itemToRestore.type];
        if (!storageKey) return false;
        
        // Restore to original location
        const originalData = JSON.parse(localStorage.getItem(storageKey) || '[]');
        originalData.push(itemToRestore.details);
        localStorage.setItem(storageKey, JSON.stringify(originalData));
        
        // Remove from archive
        deleteArchivedItem(itemId);
        
        return true;
    } catch (error) {
        console.error('Error restoring archived item:', error);
        return false;
    }
};
