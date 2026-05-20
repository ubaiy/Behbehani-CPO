/**
 * VDP icon set — outline icons in the Lucide / Feather style, rendered via
 * `react-native-svg`. 24x24 viewBox, stroke-width 2, round caps & joins.
 *
 * All icons accept (size, color) and default to 16 / brand[700]. Exports here
 * are imported by name from VDP components — do not rename or change props.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polygon, Polyline } from 'react-native-svg';
import { brand, slate, red } from '../../theme/colors';

interface IconProps {
  size?: number;
  color?: string;
}

const STROKE = {
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// `fill="none"` on <Svg> is inherited by children. Children that should be
// filled (HeartIcon when `filled`, PlayIcon's triangle) override locally.

export function ShareIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  // Feather "share-2": three nodes joined by two lines
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={18} cy={5} r={3} stroke={color} {...STROKE} />
      <Circle cx={6} cy={12} r={3} stroke={color} {...STROKE} />
      <Circle cx={18} cy={19} r={3} stroke={color} {...STROKE} />
      <Line x1={8.59} y1={13.51} x2={15.42} y2={17.49} stroke={color} {...STROKE} />
      <Line x1={15.41} y1={6.51} x2={8.59} y2={10.49} stroke={color} {...STROKE} />
    </Svg>
  );
}

export function HeartIcon({
  filled,
  size = 16,
  color,
}: {
  filled: boolean;
  size?: number;
  color?: string;
}) {
  const stroke = color ?? (filled ? red[500] : '#FFFFFF');
  const fill = filled ? red[500] : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={stroke}
        fill={fill}
        {...STROKE}
      />
    </Svg>
  );
}

export function PlayIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="5 3 19 12 5 21 5 3" stroke={color} fill={color} {...STROKE} />
    </Svg>
  );
}

export function ShieldIcon({ size = 16, color = brand[700] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        {...STROKE}
      />
    </Svg>
  );
}

export function WarrantyIcon({ size = 16, color = brand[700] }: IconProps) {
  // Feather "lock"
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} stroke={color} {...STROKE} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} {...STROKE} />
    </Svg>
  );
}

export function ReturnIcon({ size = 16, color = brand[700] }: IconProps) {
  // Feather "corner-down-left"
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9 10 4 15 9 20" stroke={color} {...STROKE} />
      <Path d="M20 4v7a4 4 0 0 1-4 4H4" stroke={color} {...STROKE} />
    </Svg>
  );
}

export function TruckIcon({ size = 16, color = brand[700] }: IconProps) {
  // Feather "truck"
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={1} y={3} width={15} height={13} stroke={color} {...STROKE} />
      <Polygon points="16 8 20 8 23 11 23 16 16 16 16 8" stroke={color} {...STROKE} />
      <Circle cx={5.5} cy={18.5} r={2.5} stroke={color} {...STROKE} />
      <Circle cx={18.5} cy={18.5} r={2.5} stroke={color} {...STROKE} />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color = brand[700] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} {...STROKE} />
    </Svg>
  );
}

export function CreditCardIcon({ size = 14, color = brand[700] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={1} y={4} width={22} height={16} rx={2} ry={2} stroke={color} {...STROKE} />
      <Line x1={1} y1={10} x2={23} y2={10} stroke={color} {...STROKE} />
    </Svg>
  );
}

export function OfferIcon({ size = 16, color = brand[700] }: IconProps) {
  // Feather "dollar-sign" — replaces the literal "$" text glyph
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={1} x2={12} y2={23} stroke={color} {...STROKE} />
      <Path
        d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        stroke={color}
        {...STROKE}
      />
    </Svg>
  );
}

export function CalendarIcon({ size = 16, color = brand[700] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} stroke={color} {...STROKE} />
      <Line x1={16} y1={2} x2={16} y2={6} stroke={color} {...STROKE} />
      <Line x1={8} y1={2} x2={8} y2={6} stroke={color} {...STROKE} />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} {...STROKE} />
    </Svg>
  );
}

export function LoanIcon({ size = 16, color = brand[700] }: IconProps) {
  // Stylised bank columns
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="12 2 2 8 22 8 12 2" stroke={color} {...STROKE} />
      <Line x1={4} y1={11} x2={4} y2={18} stroke={color} {...STROKE} />
      <Line x1={9} y1={11} x2={9} y2={18} stroke={color} {...STROKE} />
      <Line x1={15} y1={11} x2={15} y2={18} stroke={color} {...STROKE} />
      <Line x1={20} y1={11} x2={20} y2={18} stroke={color} {...STROKE} />
      <Line x1={2} y1={21} x2={22} y2={21} stroke={color} {...STROKE} />
    </Svg>
  );
}

export function ChatIcon({ size = 16, color = brand[700] }: IconProps) {
  // Feather "message-circle"
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        stroke={color}
        {...STROKE}
      />
    </Svg>
  );
}

export function PhoneIcon({ size = 16, color = slate[700] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={color}
        {...STROKE}
      />
    </Svg>
  );
}

export function CarSilhouette({ size = 80, color = slate[400] }: IconProps) {
  // Outline car icon, centered (used as VDP gallery placeholder)
  return (
    <View style={styles.carSilhouette}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" opacity={0.3}>
        <Path
          d="M10 38l4-12a4 4 0 0 1 3.8-2.8h28.4A4 4 0 0 1 50 26l4 12"
          stroke={color}
          {...STROKE}
        />
        <Path
          d="M8 38h48v10a2 2 0 0 1-2 2h-6v-4H16v4h-6a2 2 0 0 1-2-2V38z"
          stroke={color}
          {...STROKE}
        />
        <Circle cx={18} cy={46} r={4} stroke={color} {...STROKE} />
        <Circle cx={46} cy={46} r={4} stroke={color} {...STROKE} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  carSilhouette: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});
