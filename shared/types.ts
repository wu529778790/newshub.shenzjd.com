/**
 * @deprecated 该文件已过时，请使用 types-new.ts
 * 保留此文件以确保向后兼容，将在未来版本中移除
 */

// import type { colors } from "unocss/preset-mini"
// 临时使用简化的颜色类型定义
type Colors = {
  red: any;
  blue: any;
  green: any;
  yellow: any;
  purple: any;
  pink: any;
  gray: any;
  orange: any;
  teal: any;
  cyan: any;
  indigo: any;
  emerald: any;
  rose: any;
  violet: any;
  amber: any;
  lime: any;
  sky: any;
  slate: any;
  zinc: any;
  neutral: any;
  stone: any;
  current: any;
  inherit: any;
  transparent: any;
  black: any;
  white: any;
};
import type { columns, fixedColumnIds } from "./metadata";
import type { originSources } from "./pre-sources";

export type Color =
  | "primary"
  | Exclude<
      keyof Colors,
      "current" | "inherit" | "transparent" | "black" | "white"
    >;

type ConstSources = typeof originSources;
type MainSourceID = keyof ConstSources;

export type SourceID = {
  [Key in MainSourceID]: ConstSources[Key] extends { disable?: true }
    ? never
    : ConstSources[Key] extends { sub?: infer SubSource }
    ?
        | {
            [SubKey in keyof SubSource]: SubSource[SubKey] extends {
              disable?: true;
            }
              ? never
              : `${Key & string}-${SubKey & string}`;
          }[keyof SubSource]
        | Key
    : Key;
}[MainSourceID];

export type AllSourceID = {
  [Key in MainSourceID]: ConstSources[Key] extends { sub?: infer SubSource }
    ?
        | keyof {
            [SubKey in keyof SubSource as `${Key & string}-${SubKey &
              string}`]: never;
          }
        | Key
    : Key;
}[MainSourceID];

// export type DisabledSourceID = Exclude<SourceID, MainSourceID>

export type ColumnID = keyof typeof columns;
export type Metadata = Record<ColumnID, Column>;

export interface PrimitiveMetadata {
  updatedTime: number;
  data: Record<FixedColumnID, SourceID[]>;
  action: "init" | "manual" | "sync";
}

export type FixedColumnID = (typeof fixedColumnIds)[number];
export type HiddenColumnID = Exclude<ColumnID, FixedColumnID>;

export interface OriginSource
  extends Partial<Omit<Source, "name" | "redirect">> {
  name: string;
  sub?: Record<
    string,
    {
      /**
       * Subtitle 小标题
       */
      title: string;
      // type?: "hottest" | "realtime"
      // desc?: string
      // column?: ManualColumnID
      // color?: Color
      // home?: string
      // disable?: boolean
      // interval?: number
    } & Partial<Omit<Source, "title" | "name" | "redirect">>
  >;
}

export interface Source {
  name: string;
  /**
   * 刷新的间隔时间
   */
  interval: number;
  color: Color;

  /**
   * Subtitle 小标题
   */
  title?: string;
  desc?: string;
  /**
   * Default normal timeline
   */
  type?: "hottest" | "realtime";
  column?: HiddenColumnID;
  home?: string;
  /**
   * @default false
   */
  disable?: boolean | "cf";
  redirect?: SourceID;
  /**
   * 图标 (emoji 或 SVG)
   */
  icon?: string;
}

export interface Column {
  name: string;
  sources: SourceID[];
}

export interface NewsItem {
  id: string | number; // unique
  title: string;
  url: string;
  mobileUrl?: string;
  pubDate?: number | string;
  extra?: {
    hover?: string;
    date?: number | string;
    info?: false | string;
    diff?: number;
    icon?:
      | false
      | string
      | {
          url: string;
          scale: number;
        };
  };
}

export interface SourceResponse {
  status: "success" | "cache";
  id: SourceID;
  updatedTime: number | string;
  items: NewsItem[];
}
