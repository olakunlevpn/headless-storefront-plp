import type { z } from "zod";
import type {
  CartLineVMSchema,
  CartVMSchema,
  ColorCardVMSchema,
  MoneySchema,
  RawCartSchema,
  RawCollectionSchema,
  RawImageSchema,
  RawMoneySchema,
  RawProductOptionSchema,
  RawProductSchema,
  RawSelectedOptionSchema,
  RawVariantSchema,
  SizeOptionSchema,
} from "./schemas";

export type RawMoney = z.infer<typeof RawMoneySchema>;
export type RawImage = z.infer<typeof RawImageSchema>;
export type RawSelectedOption = z.infer<typeof RawSelectedOptionSchema>;
export type RawProductOption = z.infer<typeof RawProductOptionSchema>;
export type RawVariant = z.infer<typeof RawVariantSchema>;
export type RawProduct = z.infer<typeof RawProductSchema>;
export type RawCollection = z.infer<typeof RawCollectionSchema>;
export type RawCart = z.infer<typeof RawCartSchema>;

export type Money = z.infer<typeof MoneySchema>;
export type SizeOption = z.infer<typeof SizeOptionSchema>;
export type ColorCardVM = z.infer<typeof ColorCardVMSchema>;
export type CartLineVM = z.infer<typeof CartLineVMSchema>;
export type CartVM = z.infer<typeof CartVMSchema>;
