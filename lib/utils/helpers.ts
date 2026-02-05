import { twMerge } from "tailwind-merge";

export function cn(...values: Array<string | undefined | any>) {
  return twMerge(...values);
}
