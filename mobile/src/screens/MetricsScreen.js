import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import api from '../api/client';
import { useIsFocused } from '@react-navigation/native';

const MetricsScreen = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const isFocused = useIsFocused();

    const fetchMetrics = async () => {
        try {
            const res = await api.get('/transactions/metrics');
            setMetrics(res.data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchMetrics();
        }
    }, [isFocused]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMetrics();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <Text style={styles.title}>Sales Metrics</Text>

            <View style={styles.card}>
                <Text style={styles.cardLabel}>Total Revenue</Text>
                <Text style={styles.cardValue}>${metrics?.totalSales.toFixed(2)}</Text>
            </View>

            <View style={styles.row}>
                <View style={[styles.card, styles.halfCard]}>
                    <Text style={styles.cardLabel}>Total Transactions</Text>
                    <Text style={styles.cardValue}>{metrics?.count}</Text>
                </View>
                <View style={[styles.card, styles.halfCard]}>
                    <Text style={styles.cardLabel}>Paid Transactions</Text>
                    <Text style={styles.cardValue}>{metrics?.paidCount}</Text>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: 20,
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfCard: {
        width: '48%',
    },
    cardLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
});

export default MetricsScreen;
