/**
 * fontScaler.ts
 *
 * Tự động scale font size toàn app: tăng 1.5 đơn vị cho tất cả TextStyle được tạo qua StyleSheet.create.
 * Giữ nguyên tỉ lệ, không làm vỡ bố cục, hỗ trợ mọi component và màn hình.
 */
import { StyleSheet } from 'react-native';

export const FONT_INCREMENT = 1.5;

const originalCreate = StyleSheet.create;
const scaledStylesSet = new WeakSet<object>();

function scaleStyle(styleObj: any): any {
  if (!styleObj || typeof styleObj !== 'object') return styleObj;
  if (scaledStylesSet.has(styleObj)) return styleObj;

  if (Array.isArray(styleObj)) {
    return styleObj.map(scaleStyle);
  }

  const scaled: any = { ...styleObj };

  if (typeof scaled.fontSize === 'number') {
    scaled.fontSize = +(scaled.fontSize + FONT_INCREMENT).toFixed(1);
    if (typeof scaled.lineHeight === 'number') {
      scaled.lineHeight = +(scaled.lineHeight + FONT_INCREMENT).toFixed(1);
    }
  }

  scaledStylesSet.add(scaled);
  return scaled;
}

(StyleSheet as any).create = function <
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>
>(styles: T): T {
  if (!styles || typeof styles !== 'object') {
    return originalCreate(styles);
  }

  const modifiedStyles: any = {};
  for (const key in styles) {
    if (Object.prototype.hasOwnProperty.call(styles, key)) {
      modifiedStyles[key] = scaleStyle((styles as any)[key]);
    }
  }

  return originalCreate(modifiedStyles);
};
