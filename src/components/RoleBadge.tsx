import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Role } from '../types';
import { theme } from '../theme';

const roleLabel: Record<Role, string> = {
  patient: 'Пациент',
  doctor: 'Врач',
  admin: 'Админ'
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{roleLabel[role]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start'
  },
  text: {
    color: theme.colors.primary,
    fontWeight: '600'
  }
});
