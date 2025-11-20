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
 */
export function filterCustomersByProject(
    customers: Customer[],
    bookings: Booking[],
    units: Unit[],
    projectId: string | null
): Customer[] {
    if (!projectId) return customers;
    
    // Get project bookings
    const projectBookings = filterBookingsByProject(bookings, units, projectId);
    const projectCustomerIds = new Set(projectBookings.map(b => b.customerId));
    
    return customers.filter(customer => projectCustomerIds.has(customer.id));
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
    const availableUnits = filteredUnits.filter(u => u.status === 'Available').length;
    const soldUnits = filteredUnits.filter(u => u.status === 'Sold').length;
    const bookedUnits = filteredUnits.filter(u => u.status === 'Booked').length;
    
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
