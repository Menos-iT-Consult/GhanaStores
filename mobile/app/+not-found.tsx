import React from 'react';
import { Link, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>Screen not found</Text>
        <Text variant="bodyMedium" style={styles.text}>
          The page you’re looking for doesn’t exist.
        </Text>
        <Link href="/(tabs)/dashboard" asChild>
          <Button mode="contained" style={{ marginTop: 24 }}>Back to dashboard</Button>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  title: { color: '#0F172A', fontWeight: '700' },
  text: { color: '#64748B', marginTop: 8, textAlign: 'center' },
});
