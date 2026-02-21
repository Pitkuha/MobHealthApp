import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lesson } from '../types';
import { theme } from '../theme';

interface LessonCardProps {
  lesson: Lesson;
}

export function LessonCard({ lesson }: LessonCardProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, []);

  const onToggleAudio = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: lesson.audioUrl },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded) {
              setIsPlaying(false);
              return;
            }
            setIsPlaying(status.isPlaying);
          }
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } else if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.date}>{lesson.date}</Text>
        <Text style={styles.duration}>{lesson.durationMin} мин</Text>
      </View>
      <Text style={styles.title}>{lesson.title}</Text>
      <Text style={styles.description}>{lesson.description}</Text>
      <Pressable style={styles.button} onPress={onToggleAudio}>
        <Text style={styles.buttonText}>
          {isLoading ? 'Загрузка...' : isPlaying ? 'Пауза' : 'Слушать'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FBFEFF',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  date: {
    color: theme.colors.secondary,
    fontWeight: '600'
  },
  duration: {
    color: theme.colors.textMuted
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text
  },
  description: {
    color: theme.colors.textMuted,
    lineHeight: 20
  },
  button: {
    marginTop: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 9,
    alignItems: 'center'
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  }
});
