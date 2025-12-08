import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import * as Linking from 'expo-linking';
import { AuthContext } from '../context/AuthContext';
import api from '../api/client';
import { useIsFocused } from '@react-navigation/native';

const DashboardScreen = ({ navigation, route }) => {
    const { user, logout, updateUser } = useContext(AuthContext);
    const [metrics, setMetrics] = useState({ totalSales: 0, count: 0, paidCount: 0 });
    const [refreshing, setRefreshing] = useState(false);
    const isFocused = useIsFocused();

    const fetchMetrics = async () => {
        try {
            const res = await api.get('/transactions/metrics');
            setMetrics(res.data);
        } catch (error) {
            console.log(error);
        }
    };

    const checkStripeStatus = async () => {
        try {
            console.log('Checking Stripe Status...');
            const res = await api.get('/stripe/status');
            console.log('Stripe Status Response:', res.data);

            // If status changed to connected, we should update the UI
            if (res.data.connected && !user.stripe_onboarding_complete) {
                alert('Stripe connected successfully!');
                // Update user context to reflect the new status
                await updateUser({ stripe_onboarding_complete: true });
            }
        } catch (error) {
            console.log('Check Status Error:', error);
        }
    };

    useEffect(() => {
        if (route.params?.status) {
            const { status } = route.params;
            if (status === 'return') {
                checkStripeStatus();
            } else if (status === 'refresh') {
                alert('Stripe onboarding was not completed. Please try again.');
            } else if (status === 'success') {
                alert('Payment successful!');
                fetchMetrics();
            }
            // Clear params to avoid repeated alerts
            navigation.setParams({ status: null });
        }

        if (isFocused) {
            if (user?.stripe_onboarding_complete) {
                fetchMetrics();
            } else {
                checkStripeStatus();
            }
        }
    }, [isFocused, route.params]);

    const handleConnectStripe = async () => {
        try {
            // Generate the deep link scheme dynamically (works for Expo Go and Prod)
            // We strip the path to get just the scheme/base URL
            const deepLinkBase = Linking.createURL('');

            const res = await api.post('/stripe/connect', {
                deepLinkBase
            });
            if (res.data.url) {
                Linking.openURL(res.data.url);
            }
        } catch (error) {
            console.log(error);
            alert('Error connecting to Stripe: ' + (error.response?.data?.message || error.message));
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMetrics();
        setRefreshing(false);
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.welcome}>Hello, {user?.email}</Text>
                <TouchableOpacity onPress={logout}>
                    <Text style={styles.logout}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Total Sales</Text>
                <Text style={styles.amount}>${metrics.totalSales.toFixed(2)}</Text>
                <Text style={styles.subtitle}>{metrics.paidCount} successful transactions</Text>
            </View>

            {!user?.stripe_onboarding_complete ? (
                <TouchableOpacity
                    style={[styles.createButton, styles.connectButton]}
                    onPress={handleConnectStripe}
                >
                    <Text style={styles.createButtonText}>Connect Stripe to Start</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => navigation.navigate('CreateLink')}
                >
                    <Text style={styles.createButtonText}>+ Create Payment Link</Text>
                </TouchableOpacity>
            )}

            <View style={styles.quickActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('History')}>
                    <Text style={styles.actionText}>View History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Metrics')}>
                    <Text style={styles.actionText}>View Metrics</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 40,
    },
    welcome: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    logout: {
        color: 'red',
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
    },
    amount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#000',
    },
    subtitle: {
        color: '#888',
        marginTop: 5,
    },
    createButton: {
        backgroundColor: '#007AFF',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    connectButton: {
        backgroundColor: '#635BFF', // Stripe Blurple
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        width: '48%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    actionText: {
        color: '#333',
        fontWeight: '600',
    },
});

export default DashboardScreen;
