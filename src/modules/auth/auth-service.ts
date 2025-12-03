/**
 * Authentication Service
 * 
 * Handles user authentication operations following SOLID principles:
 * - Single Responsibility: Only handles auth operations
 * - Open/Closed: Extensible for new auth methods
 * - Dependency Inversion: Uses interfaces/abstractions
 */

import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

// Types
export interface RegisterUserInput {
    email: string
    password: string
    name?: string
}

export interface LoginCredentials {
    email: string
    password: string
}

export interface AuthUser {
    id: string
    email: string
    name: string | null
    image: string | null
}

// Errors
export class AuthError extends Error {
    constructor(message: string, public code: string) {
        super(message)
        this.name = "AuthError"
    }
}

/**
 * Authentication Service
 * Implements business logic for user authentication
 */
export class AuthService {
    private readonly SALT_ROUNDS = 10

    /**
     * Registers a new user with email and password
     * @throws AuthError if email already exists or validation fails
     */
    async register(input: RegisterUserInput): Promise<AuthUser> {
        // Validate input
        this.validateEmail(input.email)
        this.validatePassword(input.password)

        // Check if user already exists
        const existingUser = await this.findUserByEmail(input.email)
        if (existingUser) {
            throw new AuthError(
                "Użytkownik z tym adresem email już istnieje",
                "USER_EXISTS"
            )
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, this.SALT_ROUNDS)

        // Create user
        const [newUser] = await db.insert(users).values({
            email: input.email,
            password: hashedPassword,
            name: input.name || null,
            emailVerified: null, // Email verification can be added later
        }).returning()

        if (!newUser) {
            throw new AuthError("Nie udało się utworzyć użytkownika", "CREATE_FAILED")
        }

        return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            image: newUser.image,
        }
    }

    /**
     * Authenticates user with credentials
     * @throws AuthError if credentials are invalid
     */
    async authenticate(credentials: LoginCredentials): Promise<AuthUser> {
        this.validateEmail(credentials.email)
        
        if (!credentials.password) {
            throw new AuthError("Hasło jest wymagane", "INVALID_CREDENTIALS")
        }

        // Find user
        const user = await this.findUserByEmail(credentials.email)
        if (!user || !user.password) {
            throw new AuthError(
                "Nieprawidłowy email lub hasło",
                "INVALID_CREDENTIALS"
            )
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
        )

        if (!isValidPassword) {
            throw new AuthError(
                "Nieprawidłowy email lub hasło",
                "INVALID_CREDENTIALS"
            )
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
        }
    }

    /**
     * Finds user by email
     */
    async findUserByEmail(email: string) {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1)

        return user
    }

    /**
     * Validates email format
     */
    private validateEmail(email: string): void {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email || !emailRegex.test(email)) {
            throw new AuthError("Nieprawidłowy format adresu email", "INVALID_EMAIL")
        }
    }

    /**
     * Validates password strength
     */
    private validatePassword(password: string): void {
        if (!password || password.length < 8) {
            throw new AuthError(
                "Hasło musi mieć co najmniej 8 znaków",
                "WEAK_PASSWORD"
            )
        }

        // Optional: Add more password requirements
        // const hasUpperCase = /[A-Z]/.test(password)
        // const hasLowerCase = /[a-z]/.test(password)
        // const hasNumber = /[0-9]/.test(password)
    }
}



