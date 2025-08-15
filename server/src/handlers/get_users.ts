import { type User, type PaginationInput } from '../schema';

export const getUsers = async (input?: PaginationInput): Promise<User[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching users from the database with pagination support.
    // Should exclude password_hash from the returned data for security.
    return Promise.resolve([]);
};

export const getUserById = async (id: number): Promise<User | null> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching a specific user by ID.
    // Should exclude password_hash from the returned data for security.
    return Promise.resolve(null);
};