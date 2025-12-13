/**
 * Project Filter Utilities
 * Helper functions to filter data by active project across all pages
 */

import { Unit, Booking, Payment, Expense, Customer } from '../types';

/**
 * Filter units by project
 */
export function filterUnitsByProject(units: Unit[], projectId: string | null): Unit[] {
    if (!projectId) return units;
    return units.filter(unit => unit.projectId === projectId);
}

/**
 * Filter bookings by project (through unit relationship)
 */
export function filterBookingsByProject(
    bookings: Booking[], 
    units: Unit[], 
    projectId: string | null
): Booking[] {
    if (!projectId) return bookings;
    
    const projectUnitIds = new Set(
        units
            .filter(unit => unit.projectId === projectId)
            .map(unit => unit.id)
    );
    
    return bookings.filter(booking => projectUnitIds.has(booking.unitId));
}

/**
 * Filter payments by project (through booking -> unit relationship)
 */
export function filterPaymentsByProject(
    payments: Payment[],
    bookings: Booking[],
    units: Unit[],
    projectId: string | null
): Payment[] {
    if (!projectId) return payments;
    
    // Get project bookings
    const projectBookings = filterBookingsByProject(bookings, units, projectId);
    const projectBookingIds = new Set(projectBookings.map(b => b.id));
    
    return payments.filter(payment => projectBookingIds.has(payment.bookingId));
}

/**
 * Filter expenses by project
 */
export function filterExpensesByProject(expenses: Expense[], projectId: string | null): Expense[] {
    if (!projectId) return expenses;
    return expenses.filter(expense => expense.projectId === projectId);
}

/**
 * Get customers who have units/bookings in a specific project
 * Returns customers who have at least one booking in the specified project
 */
export function filterCustomersByProject(
    customers: Customer[],
    bookings: Booking[],
    units: Unit[],
    projectId: string | null
): Customer[] {
    // If no project filter, return all customers
    if (!projectId) return customers;
    
    // Get unit IDs that belong to the selected project
    const projectUnitIds = new Set(
        units.filter(u => u.projectId === projectId).map(u => u.id)
    );
    
    // Get customer IDs who have bookings in units belonging to this project
    const customerIdsWithBookings = new Set(
        bookings
            .filter(b => projectUnitIds.has(b.unitId))
            .map(b => b.customerId)
    );
    
    // Also include customers directly assigned to this project
    const customerIdsDirectlyAssigned = new Set(
        customers.filter(c => c.projectId === projectId).map(c => c.id)
    );
    
    // Merge both sets
    const allCustomerIds = new Set([...customerIdsWithBookings, ...customerIdsDirectlyAssigned]);
    
    // Return customers who are in either set
    return customers.filter(c => allCustomerIds.has(c.id));
}

/**
 * Calculate project-specific statistics
 */
export function calculateProjectStats(
    units: Unit[],
    bookings: Booking[],
    payments: Payment[],
    projectId: string | null
) {
    const filteredUnits = filterUnitsByProject(units, projectId);
    const filteredBookings = filterBookingsByProject(bookings, units, projectId);
    const filteredPayments = filterPaymentsByProject(payments, bookings, units, projectId);
    
    const totalUnits = filteredUnits.length;
    const availableUnits = filteredUnits.filter(u => u.status === 'Available' || u.status === 'متاح').length;
    const soldUnits = filteredUnits.filter(u => u.status === 'Sold' || u.status === 'مباع').length;
    const bookedUnits = filteredUnits.filter(u => u.status === 'Booked' || u.status === 'محجوز').length;
    
    const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0) +
                        filteredBookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
    
    return {
        totalUnits,
        availableUnits,
        soldUnits,
        bookedUnits,
        totalRevenue,
        totalBookings: filteredBookings.length,
        totalPayments: filteredPayments.length
    };
}

export default {
    filterUnitsByProject,
    filterBookingsByProject,
    filterPaymentsByProject,
    filterExpensesByProject,
    filterCustomersByProject,
    calculateProjectStats
};
