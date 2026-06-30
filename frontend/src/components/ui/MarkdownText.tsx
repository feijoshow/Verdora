import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

interface MarkdownTextProps extends Omit<TextProps, 'children'> {
  children: string;
  style?: StyleProp<TextStyle>;
  boldStyle?: StyleProp<TextStyle>;
}

/** Renders inline **bold** markers from AI responses as actual bold text. */
export function MarkdownText({ children, style, boldStyle, selectable, ...rest }: MarkdownTextProps) {
  if (!children) return null;

  const parts = children.split(/(\*\*[^*]+\*\*)/g);

  return (
    <Text style={style} selectable={selectable} {...rest}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <Text key={index} style={[style, boldStyle, styles.bold]} selectable={selectable}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
});
