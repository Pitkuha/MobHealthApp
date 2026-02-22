import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import { useAppData } from '../context/AppContext';
import { theme } from '../theme';
import { AdminScreen } from '../screens/AdminScreen';
import { AIScreen } from '../screens/AIScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { DoctorToolsScreen } from '../screens/DoctorToolsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RemindersScreen } from '../screens/RemindersScreen';

const Tab = createBottomTabNavigator();

function IconLabel({ label }: { label: string }) {
  return <Text style={{ fontSize: 11 }}>{label}</Text>;
}

function LoaderScreen({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.loaderWrap}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loaderText}>{message}</Text>
    </SafeAreaView>
  );
}

export function RootNavigator() {
  const { currentUser, isLoading, initError } = useAppData();

  if (isLoading) {
    return <LoaderScreen message="Инициализация приложения" />;
  }

  if (!currentUser) {
    return (
      <>
        <AuthScreen />
        {initError ? <Text style={styles.errorText}>{initError}</Text> : null}
      </>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: '#7D8B99',
          tabBarStyle: {
            borderTopColor: '#D6E4F0',
            height: 64,
            paddingBottom: 8,
            paddingTop: 7
          }
        }}
      >
        <Tab.Screen
          name="home"
          component={HomeScreen}
          options={{
            title: 'Главная',
            tabBarIcon: () => <IconLabel label="Дом" />
          }}
        />
        <Tab.Screen
          name="calendar"
          component={CalendarScreen}
          options={{
            title: 'Календарь',
            tabBarIcon: () => <IconLabel label="Дни" />
          }}
        />
        <Tab.Screen
          name="ai"
          component={AIScreen}
          options={{
            title: 'AI',
            tabBarIcon: () => <IconLabel label="AI" />
          }}
        />
        <Tab.Screen
          name="chat"
          component={ChatScreen}
          options={{
            title: 'Чат',
            tabBarIcon: () => <IconLabel label="Чат" />
          }}
        />

        {currentUser.role === 'patient' ? (
          <Tab.Screen
            name="reminders"
            component={RemindersScreen}
            options={{
              title: 'Напоминания',
              tabBarIcon: () => <IconLabel label="Push" />
            }}
          />
        ) : null}

        {currentUser.role === 'doctor' ? (
          <Tab.Screen
            name="doctorTools"
            component={DoctorToolsScreen}
            options={{
              title: 'Коды',
              tabBarIcon: () => <IconLabel label="Коды" />
            }}
          />
        ) : null}

        {currentUser.role === 'admin' ? (
          <Tab.Screen
            name="admin"
            component={AdminScreen}
            options={{
              title: 'Админ',
              tabBarIcon: () => <IconLabel label="Админ" />
            }}
          />
        ) : null}

        <Tab.Screen
          name="profile"
          component={ProfileScreen}
          options={{
            title: 'Кабинет',
            tabBarIcon: () => <IconLabel label="Профиль" />
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loaderText: {
    color: theme.colors.textMuted
  },
  errorText: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    color: theme.colors.danger,
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F7CACA',
    borderRadius: 10,
    padding: 10,
    textAlign: 'center'
  }
});
