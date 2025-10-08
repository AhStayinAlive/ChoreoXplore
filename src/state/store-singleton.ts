import { create } from "zustand";

export function singleton<T>(key:string, make:()=>T){
  // @ts-ignore
  if(!(window as any)[key]) (window as any)[key] = make();
  // @ts-ignore
  return (window as any)[key] as T;
}

export const createZustand = <S,>(init:any)=>create<S>(init);

