import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Share } from 'react-native';
import * as Linking from 'expo-linking';
import api from '../api/client';

const CreateLinkScreen = ({ navigation }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState(null);

    const handleCreateLink = async () => {
        if (!amount) {
            Alert.alert('Error', 'Please enter an amount');
            return;
        }

        setLoading(true);
        try {
            // Generate the deep link scheme dynamically
            const deepLinkBase = Linking.createURL('');

            const res = await api.post('/transactions/create-link', {
                amount: parseFloat(amount),
                description,
                currency: 'usd',
                deepLinkBase
            });
            setGeneratedLink(res.data.payment_url);
        } catch (error) {
            Alert.alert('Error', 'Failed to create link');
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Pay me here: ${generatedLink}`,
            });
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Payment Link</Text>

            {!generatedLink ? (
                <>
                    <Text style={styles.label}>Amount (USD)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Service or Product"
                        value={description}
                        onChangeText={setDescription}
                    />

                    <TouchableOpacity style={styles.button} onPress={handleCreateLink} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Generate Link</Text>
                        )}
                    </TouchableOpacity>
                </>
            ) : (
                <View style={styles.resultContainer}>
                    <Text style={styles.successText}>Link Created Successfully!</Text>
                    <Text style={styles.linkText}>{generatedLink}</Text>

                    <TouchableOpacity style={styles.button} onPress={handleShare}>
                        <Text style={styles.buttonText}>Share Link</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={() => {
                            setGeneratedLink(null);
                            setAmount('');
                            setDescription('');
                            navigation.navigate('Dashboard');
                        }}
                    >
                        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Done</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        marginTop: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resultContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    successText: {
        fontSize: 20,
        color: 'green',
        fontWeight: 'bold',
        marginBottom: 20,
    },
    linkText: {
        fontSize: 16,
        color: '#007AFF',
        marginBottom: 30,
        textAlign: 'center',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#007AFF',
        marginTop: 15,
        width: '100%',
    },
    secondaryButtonText: {
        color: '#007AFF',
    },
});

export default CreateLinkScreen;
