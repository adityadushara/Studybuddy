'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi, UserProfile, LoginPayload, RegisterPayload } from '@/lib/api'
import { getToken, setToken, removeToken, setStoredUser, getStoredUser, StoredUser } from '@/lib/auth'

interface AuthContextValue {
    user: UserProfile | null
    token: string | null
    loading: boolean
    login: (data: LoginPayload) => Promise<void>
    register: (data: RegisterPayload) => Promise<void>
    logout: () => void
    updateUser: (data: Partial<UserProfile>) => Promise<void>
    deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [token, setTokenState] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const storedToken = getToken()
        const storedUser = getStoredUser()
        if (storedToken && storedUser) {
            setTokenState(storedToken)
            setUser(storedUser as UserProfile)
            // Verify token by fetching fresh user data
            authApi.me().then(freshUser => {
                setUser(freshUser)
                setStoredUser(freshUser as StoredUser)
            }).catch(() => {
                removeToken()
                setTokenState(null)
                setUser(null)
            }).finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    const login = async (data: LoginPayload) => {
        const res = await authApi.login(data)
        setToken(res.access_token)
        setTokenState(res.access_token)
        setUser(res.user)
        setStoredUser(res.user as StoredUser)
    }

    const register = async (data: RegisterPayload) => {
        const res = await authApi.register(data)
        setToken(res.access_token)
        setTokenState(res.access_token)
        setUser(res.user)
        setStoredUser(res.user as StoredUser)
    }

    const logout = () => {
        removeToken()
        setTokenState(null)
        setUser(null)
    }

    const updateUser = async (data: Partial<UserProfile>) => {
        const updated = await authApi.updateProfile(data)
        setUser(updated)
        setStoredUser(updated as StoredUser)
    }

    const deleteAccount = async () => {
        await authApi.deleteAccount()
        logout()
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, deleteAccount }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
