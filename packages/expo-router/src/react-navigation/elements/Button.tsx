import Color from 'color';
import { Platform, StyleSheet } from 'react-native';

import { router } from '../../imperative-api';
import type { Href } from '../../types';
import { useTheme } from '../native';
import { PlatformPressable, type Props as PlatformPressableProps } from './PlatformPressable';
import { Text } from './Text';

type ButtonProps = Omit<PlatformPressableProps, 'children' | 'href'> & {
  href?: Href;
  variant?: 'plain' | 'tinted' | 'filled';
  color?: string;
  children: string | string[];
};

const BUTTON_RADIUS = 40;

export function Button({
  href,
  onPress,
  variant = 'tinted',
  color: customColor,
  android_ripple,
  style,
  children,
  ...rest
}: ButtonProps) {
  const { colors, fonts } = useTheme();

  const color = customColor ?? colors.primary;

  let backgroundColor;
  let textColor;

  switch (variant) {
    case 'plain':
      backgroundColor = 'transparent';
      textColor = color;
      break;
    case 'tinted':
      backgroundColor = Color(color).fade(0.85).string();
      textColor = color;
      break;
    case 'filled':
      backgroundColor = color;
      textColor = Color(color).isDark() ? 'white' : Color(color).darken(0.71).string();
      break;
  }

  return (
    <PlatformPressable
      {...rest}
      onPress={(event) => {
        onPress?.(event);
        if (href && !event?.defaultPrevented) {
          router.navigate(href);
        }
      }}
      android_ripple={{
        radius: BUTTON_RADIUS,
        color: Color(textColor).fade(0.85).string(),
        ...android_ripple,
      }}
      pressOpacity={Platform.OS === 'ios' ? undefined : 1}
      hoverEffect={{ color: textColor }}
      style={[{ backgroundColor }, styles.button, style]}>
      <Text style={[{ color: textColor }, fonts.regular, styles.text]}>{children}</Text>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BUTTON_RADIUS,
    borderCurve: 'continuous',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
