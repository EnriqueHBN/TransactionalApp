import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../api/client';
import { useIsFocused } from '@react-navigation/native';

const HistoryScreen = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const isFocused = useIsFocused();

    const fetchTransactions = async () => {
        try {
            const res = await api.get('/transactions');
            setTransactions(res.data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchTransactions();
        }
    }, [isFocused]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchTransactions();
        setRefreshing(false);
    };

    const renderItem = ({ item }) => (
        <View style={styles.item}>
            <View style={styles.row}>
                <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
                <Text style={[
                    styles.status,
                    item.status === 'PAID' ? styles.paid :
                        item.status === 'PENDING' ? styles.pending : styles.cancelled
                ]}>
                    {item.status}
                </Text>
            </View>
            <Text style={styles.description}>{item.description || 'No description'}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Transaction History</Text>
            <FlatList
                data={transactions}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>No transactions found</Text>}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />
        </View>
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
    list: {
        paddingBottom: 20,
    },
    item: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    status: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    paid: { color: 'green' },
    pending: { color: 'orange' },
    cancelled: { color: 'red' },
    description: {
        color: '#666',
        marginBottom: 5,
    },
    date: {
        color: '#999',
        fontSize: 12,
    },
    empty: {
        textAlign: 'center',
        marginTop: 50,
        color: '#666',
    },
});

export default HistoryScreen;
