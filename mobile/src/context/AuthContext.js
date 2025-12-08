import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('token');
            const storedUser = await AsyncStorage.getItem('user');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.log(e);
        }
    };

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            const { token, ...userData } = res.data;

            setToken(token);
            setUser(userData);

            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
            console.log(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email, password) => {
        setIsLoading(true);
        try {
            const res = await api.post('/auth/register', { email, password });
            const { token, ...userData } = res.data;

            setToken(token);
            setUser(userData);

            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
            console.log(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        setToken(null);
        setUser(null);
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        setIsLoading(false);
    };

    const updateUser = async (userData) => {
        // Merge existing user data with new data
        const newUser = { ...user, ...userData };
        setUser(newUser);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
