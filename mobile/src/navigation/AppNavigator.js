import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthContext } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CreateLinkScreen from '../screens/CreateLinkScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MetricsScreen from '../screens/MetricsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
);

import { Ionicons } from '@expo/vector-icons';

const AppTabs = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Dashboard') {
                    iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Metrics') {
                    iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                } else if (route.name === 'History') {
                    iconName = focused ? 'time' : 'time-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: 'gray',
        })}
    >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
        <Tab.Screen name="Metrics" component={MetricsScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
);

const AppStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="Main" component={AppTabs} options={{ headerShown: false }} />
        <Stack.Screen name="CreateLink" component={CreateLinkScreen} options={{ title: 'Create Link' }} />
    </Stack.Navigator>
);

const AppNavigator = () => {
    const { token, isLoading } = useContext(AuthContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    const linking = {
        prefixes: [Linking.createURL('/'), 'mobile://'],
        config: {
            screens: {
                Main: {
                    screens: {
                        Dashboard: 'stripe/:status',
                    }
                },
            }
        }
    };
    return (
        <NavigationContainer linking={linking}>
            {token ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
};

export default AppNavigator;
